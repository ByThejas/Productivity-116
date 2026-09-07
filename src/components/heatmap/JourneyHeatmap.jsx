import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Check,
  Circle,
} from "lucide-react";

import {
  createJourneyDays,
  createSegmentPath,
  getDayCompletion,
  getMonthMarkers,
  getJourneyCommitments,
  loadJourneyConfig,
  parseStoredDate,
  polarToCartesian,
} from "./heatmapUtils";

const STORAGE_KEY =
  "productivity-116-habits-v3";

const CENTER = 300;
const INNER_RADIUS = 105;
const RING_WIDTH = 25;
const RING_GAP = 4;

/*
  Habit states:

  null  = untouched / blank
  true  = completed / green
  false = not completed / red
*/

function createBlankHabitState(commitments) {
  return commitments.reduce((state, commitment) => {
    state[commitment.id] = null;
    return state;
  }, {});
}

function createInitialState() {
  try {
    const saved =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!saved) {
      return {};
    }

    const parsed =
      JSON.parse(saved);

    if (
      !parsed ||
      typeof parsed !== "object"
    ) {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

function getHabitState(
  state,
  dayNumber,
  commitments
) {
  return (
    state[dayNumber] ||
    createBlankHabitState(commitments)
  );
}

function getJourneyDayNumber(config, dayCount) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = parseStoredDate(config?.startDate);
  const end = parseStoredDate(config?.endDate);

  if (!start || !end || dayCount <= 0) {
    return 1;
  }

  if (today < start) {
    return 1;
  }

  if (today > end) {
    return dayCount;
  }

  return Math.min(
    Math.max(
      Math.round((today - start) / (1000 * 60 * 60 * 24)) + 1,
      1
    ),
    dayCount
  );
}

function getSegmentColor(status) {
  if (status === "completed") {
    return "rgba(53, 199, 89, 0.95)";
  }

  if (status === "not_completed") {
    return "rgba(255, 69, 58, 0.9)";
  }

  return "rgba(255, 255, 255, 0.045)";
}

function getSegmentHoverColor(status) {
  if (status === "completed") {
    return "rgba(70, 220, 105, 1)";
  }

  if (status === "not_completed") {
    return "rgba(255, 84, 74, 1)";
  }

  return "rgba(255, 255, 255, 0.12)";
}

/*
  Calculate consecutive fully completed
  journey days from the latest completed
  day backwards.
*/
function calculateCurrentStreak(
  days,
  habitState,
  commitments
) {
  const completedDays = days.filter(
    (day) =>
      getDayCompletion(
        getHabitState(
          habitState,
          day.dayNumber,
          commitments
        )
      ) === commitments.length
  );

  if (completedDays.length === 0) {
    return 0;
  }

  const completedDayNumbers =
    new Set(
      completedDays.map(
        (day) => day.dayNumber
      )
    );

  let streak = 0;

  let dayNumber =
    completedDays[
      completedDays.length - 1
    ].dayNumber;

  while (
    completedDayNumbers.has(
      dayNumber
    )
  ) {
    streak += 1;
    dayNumber -= 1;
  }

  return streak;
}

/*
  Calculate the longest consecutive
  streak of fully completed days.
*/
function calculateBestStreak(
  days,
  habitState,
  commitments
) {
  let bestStreak = 0;
  let currentStreak = 0;

  days.forEach((day) => {
    const completed =
      getDayCompletion(
        getHabitState(
          habitState,
          day.dayNumber,
          commitments
        )
      ) === commitments.length;

    if (completed) {
      currentStreak += 1;

      bestStreak = Math.max(
        bestStreak,
        currentStreak
      );
    } else {
      currentStreak = 0;
    }
  });

  return bestStreak;
}

function JourneyHeatmap() {
  const [journeyConfig, setJourneyConfig] =
    useState(loadJourneyConfig);

  const commitments =
    getJourneyCommitments(journeyConfig);

  const startDate =
    parseStoredDate(journeyConfig.startDate);

  const endDate =
    parseStoredDate(journeyConfig.endDate);

  const days = useMemo(
    () => createJourneyDays(startDate, endDate),
    [journeyConfig.startDate, journeyConfig.endDate]
  );

  const dayCount = days.length;

  const dynamicRingGap =
    commitments.length > 5 ? 3 : RING_GAP;

  const dynamicRingWidth = Math.min(
    RING_WIDTH,
    Math.max(
      8,
      (218 - INNER_RADIUS - dynamicRingGap * (commitments.length - 1)) /
        Math.max(commitments.length, 1)
    )
  );

  const monthMarkers = useMemo(
    () => getMonthMarkers(days),
    [days]
  );

  const initialJourneyDay =
    getJourneyDayNumber(journeyConfig, dayCount);

  const [
    selectedDayIndex,
    setSelectedDayIndex,
  ] = useState(
    Math.max(0, initialJourneyDay - 1)
  );

  const [
    habitState,
    setHabitState,
  ] = useState(createInitialState);

  const [
    hoveredSegment,
    setHoveredSegment,
  ] = useState(null);

  const [
    statusMenu,
    setStatusMenu,
  ] = useState(null);

  useEffect(() => {
    function handleJourneyConfigUpdate() {
      setJourneyConfig(loadJourneyConfig());
    }

    window.addEventListener(
      "journey-config-updated",
      handleJourneyConfigUpdate
    );

    return () => {
      window.removeEventListener(
        "journey-config-updated",
        handleJourneyConfigUpdate
      );
    };
  }, []);

  useEffect(() => {
    const currentDay = getJourneyDayNumber(
      journeyConfig,
      dayCount
    );

    setSelectedDayIndex(
      Math.max(0, Math.min(currentDay - 1, dayCount - 1))
    );
  }, [journeyConfig.startDate, journeyConfig.endDate, dayCount]);

  /*
    Save habit state.
  */

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(habitState)
    );
  }, [habitState]);

  /*
    Listen for changes coming from
    the Water Tracker.

    This allows the spiral to update
    immediately when 4L is reached.
  */

  useEffect(() => {
    function handleHabitUpdate() {
      try {
        const saved =
          localStorage.getItem(
            STORAGE_KEY
          );

        if (!saved) {
          return;
        }

        const parsed =
          JSON.parse(saved);

        if (
          parsed &&
          typeof parsed === "object"
        ) {
          setHabitState(parsed);
        }
      } catch {
        // Ignore storage errors.
      }
    }

    window.addEventListener(
      "habit-state-updated",
      handleHabitUpdate
    );

    return () => {
      window.removeEventListener(
        "habit-state-updated",
        handleHabitUpdate
      );
    };
  }, []);

  /*
    Notify Overview about the
    initially selected journey day.

    This keeps the heatmap and
    dashboard synchronized when
    the application first loads.
  */

  useEffect(() => {
    const day =
      days[selectedDayIndex];

    if (!day) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent(
        "journey-day-selected",
        {
          detail: {
            dayNumber:
              day.dayNumber,
          },
        }
      )
    );
  }, [days, selectedDayIndex]);

  /*
    Selected day information.
  */

  const selectedDay =
    days[selectedDayIndex] || days[0];

  if (!selectedDay) {
    return null;
  }

  const selectedHabits =
    getHabitState(
      habitState,
      selectedDay.dayNumber,
      commitments
    );

  const selectedCompletion =
    getDayCompletion(
      selectedHabits,
      commitments
    );

  /*
    Journey progress.
  */

  const completedDays =
    days.filter((day) => {
      const state =
        getHabitState(
          habitState,
          day.dayNumber,
          commitments
        );

      return (
        getDayCompletion(
          state,
          commitments
        ) === commitments.length
      );
    }).length;

  const journeyProgress =
    Math.round(
      (completedDays / dayCount) *
        100
    );

  const currentStreak =
    calculateCurrentStreak(
      days,
      habitState,
      commitments
    );

  const bestStreak =
    calculateBestStreak(
      days,
      habitState,
      commitments
    );

  /*
    Select a journey day.

    The custom event allows Overview
    to synchronize its selected day
    with the heatmap.
  */

  function selectJourneyDay(dayIndex) {
    setSelectedDayIndex(dayIndex);

    const day =
      days[dayIndex];

    if (!day) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent(
        "journey-day-selected",
        {
          detail: {
            dayNumber:
              day.dayNumber,
          },
        }
      )
    );
  }

  /*
    Set a habit status.

    completed
      true = green

    not_completed
      false = red
  */

  function setHabitStatus(
    dayNumber,
    habitId,
    status
  ) {
    setHabitState((previous) => {
      const current =
        getHabitState(
          previous,
          dayNumber,
          commitments
        );

      return {
        ...previous,

        [dayNumber]: {
          ...current,

          [habitId]:
            status === "completed"
              ? true
              : false,
        },
      };
    });

    setStatusMenu(null);
  }

  /*
    Open status popup.
  */

  function openStatusMenu(
    event,
    dayIndex,
    dayNumber,
    habitId
  ) {
    event.stopPropagation();

    selectJourneyDay(dayIndex);

    const rect =
      event.currentTarget.getBoundingClientRect();

    setStatusMenu({
      dayNumber,
      habitId,
      x:
        rect.left +
        rect.width / 2,
      y:
        rect.bottom + 10,
    });
  }

  /*
    Close popup.
  */

  function closeStatusMenu() {
    setStatusMenu(null);
  }

  /*
    Keyboard support.
  */

  function handleSegmentKeyDown(
    event,
    dayIndex,
    dayNumber,
    habitId
  ) {
    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();

      openStatusMenu(
        event,
        dayIndex,
        dayNumber,
        habitId
      );
    }

    if (
      event.key === "Escape"
    ) {
      closeStatusMenu();
    }
  }

  return (
    <section className="journey-section">

      {/* =========================================
          JOURNEY HEADER
      ========================================= */}

      <div className="journey-header">

        <div>
          <span className="eyebrow">
            {journeyConfig.primaryGoal || "Your journey"}
          </span>

          <h2>
            {dayCount} Days
          </h2>

          <p>
            {days[0]?.shortDate} —{" "}
            {days[days.length - 1]?.shortDate}
          </p>
        </div>

        <div className="journey-stats">

          <div>
            <strong>
              {completedDays}
            </strong>

            <span>
              completed
            </span>
          </div>

          <div>
            <strong>
              {journeyProgress}%
            </strong>

            <span>
              progress
            </span>
          </div>

          <div>
            <strong>
              {currentStreak}
            </strong>

            <span>
              current streak
            </span>
          </div>

          <div>
            <strong>
              {bestStreak}
            </strong>

            <span>
              best streak
            </span>
          </div>

        </div>

      </div>

      {/* =========================================
          HEATMAP CARD
      ========================================= */}

      <div
        className="journey-card"
        onClick={() => {
          if (statusMenu) {
            closeStatusMenu();
          }
        }}
      >

        <div className="journey-visual">

          <svg
            className="journey-svg"
            viewBox="0 0 600 600"
            role="img"
            aria-label={`${dayCount} day ${commitments.length} commitment journey heatmap`}
          >

            <defs>

              {/* Green glow */}

              <filter
                id="completedGlow"
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feGaussianBlur
                  stdDeviation="2.5"
                  result="blur"
                />

                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Red glow */}

              <filter
                id="notCompletedGlow"
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feGaussianBlur
                  stdDeviation="1.5"
                  result="blur"
                />

                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

            </defs>

            {/* =====================================
                OUTER BOUNDARY
            ===================================== */}

            <circle
              cx={CENTER}
              cy={CENTER}
              r={218}
              fill="none"
              stroke="rgba(255,255,255,0.035)"
              strokeWidth="1"
            />

            {/* =====================================
                FOUR HABIT RINGS
            ===================================== */}

            {commitments.map(
              (
                commitment,
                commitmentIndex
              ) => {

                const outerRadius =
                  INNER_RADIUS +
                  (dynamicRingWidth +
                    dynamicRingGap) *
                    (commitments.length -
                      1 -
                      commitmentIndex) +
                  dynamicRingWidth;

                const innerRadius =
                  outerRadius -
                  dynamicRingWidth;

                return days.map(
                  (day) => {

                    const dayAngle =
                      360 / dayCount;

                    const gap = 0.65;

                    const startAngle =
                      day.index *
                        dayAngle -
                      90 +
                      gap;

                    const endAngle =
                      (day.index + 1) *
                        dayAngle -
                      90 -
                      gap;

                    const state =
                      getHabitState(
                        habitState,
                        day.dayNumber,
                        commitments
                      );

                    /*
                      null  = blank
                      true  = green
                      false = red
                    */

                    const habitValue =
                      state[commitment.id];

                    const status =
                      habitValue === null
                        ? "empty"
                        : habitValue === true
                          ? "completed"
                          : "not_completed";

                    const segmentId =
                      `${day.dayNumber}-${commitment.id}`;

                    const isHovered =
                      hoveredSegment ===
                      segmentId;

                    const isSelected =
                      selectedDayIndex ===
                      day.index;

                    const path =
                      createSegmentPath(
                        CENTER,
                        innerRadius,
                        outerRadius,
                        startAngle,
                        endAngle
                      );

                    let filter;

                    if (
                      status ===
                      "completed"
                    ) {
                      filter =
                        "url(#completedGlow)";
                    } else if (
                      status ===
                      "not_completed"
                    ) {
                      filter =
                        "url(#notCompletedGlow)";
                    }

                    return (
                      <path
                        key={segmentId}
                        d={path}

                        style={{
                          fill: isHovered
                            ? getSegmentHoverColor(status)
                            : getSegmentColor(status),
                        }}

                        stroke={
                          isSelected
                            ? "rgba(255,255,255,0.8)"
                            : "rgba(255,255,255,0.018)"
                        }

                        strokeWidth={
                          isSelected
                            ? 1.4
                            : 0.5
                        }

                        className="journey-segment"

                        tabIndex={0}

                        role="button"

                        aria-label={`${commitment.label}, ${day.fullDate}, ${
                          status ===
                          "completed"
                            ? "completed"
                            : status ===
                              "not_completed"
                              ? "not completed"
                              : "not set"
                        }`}

                        onClick={(event) =>
                          openStatusMenu(
                            event,
                            day.index,
                            day.dayNumber,
                            commitment.id
                          )
                        }

                        onMouseEnter={() =>
                          setHoveredSegment(
                            segmentId
                          )
                        }

                        onMouseLeave={() =>
                          setHoveredSegment(
                            null
                          )
                        }

                        onFocus={() =>
                          setHoveredSegment(
                            segmentId
                          )
                        }

                        onBlur={() =>
                          setHoveredSegment(
                            null
                          )
                        }

                        onKeyDown={(event) =>
                          handleSegmentKeyDown(
                            event,
                            day.index,
                            day.dayNumber,
                            commitment.id
                          )
                        }

                        filter={filter}
                      />
                    );
                  }
                );
              }
            )}

            {/* =====================================
                MONTH LABELS
            ===================================== */}

            {monthMarkers.map(
              (marker) => {

                const angle =
                  marker.dayIndex *
                  (360 / dayCount);

                const position =
                  polarToCartesian(
                    CENTER,
                    CENTER,
                    244,
                    angle
                  );

                return (
                  <text
                    key={marker.month}
                    x={position.x}
                    y={position.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="journey-month"
                  >
                    {marker.month.toUpperCase()}
                  </text>
                );
              }
            )}

            {/* =====================================
                CENTER
            ===================================== */}

            <circle
              cx={CENTER}
              cy={CENTER}
              r={98}
              className="journey-center-disc"
              fill="rgba(7,8,10,0.94)"
              stroke="rgba(255,255,255,0.055)"
              strokeWidth="1"
            />

            <circle
              cx={CENTER}
              cy={CENTER}
              r={91}
              className="journey-center-inner-ring"
              fill="none"
              stroke="rgba(255,255,255,0.025)"
              strokeWidth="1"
            />

            <text
              x={CENTER}
              y="270"
              textAnchor="middle"
              className="journey-center-eyebrow"
              fontSize="10"
              fontWeight="500"
              letterSpacing="0.17em"
            >
              DAY {selectedDay.dayNumber}
            </text>

            <text
              x={CENTER}
              y="302"
              textAnchor="middle"
              className="journey-center-date"
              fontSize="20"
              fontWeight="500"
              letterSpacing="-0.04em"
            >
              {selectedDay.shortDate}
            </text>

            <text
              x={CENTER}
              y="327"
              textAnchor="middle"
              className="journey-center-completion"
              fontSize="9"
              fontWeight="500"
              letterSpacing="0.08em"
            >
              {selectedCompletion}/
              {commitments.length} COMPLETE
            </text>

          </svg>

        </div>

        {/* =========================================
            SELECTED DAY
        ========================================= */}

        <div
          className="journey-selected"
          onClick={(event) =>
            event.stopPropagation()
          }
        >

          <div className="selected-day-number">
            {String(
              selectedDay.dayNumber
            ).padStart(2, "0")}
          </div>

          <div className="selected-day-info">

            <span className="eyebrow">
              Selected day
            </span>

            <strong>
              {selectedDay.fullDate}
            </strong>

            <span>
              {selectedCompletion} of{" "}
              {commitments.length} commitments
              completed
            </span>

          </div>

          {/* =====================================
              COMMITMENT TABS
          ===================================== */}

          <div className="habit-legend">

            {commitments.map(
              (commitment) => {

                const value =
                  selectedHabits[
                    commitment.id
                  ];

                const completed =
                  value === true;

                const notCompleted =
                  value === false;

                return (
                  <div
                    key={commitment.id}
                    className="habit-control"
                  >

                    <button
                      type="button"

                      className={`habit-legend-item ${
                        completed
                          ? "completed"
                          : notCompleted
                            ? "not-completed"
                            : ""
                      }`}

                      onClick={(event) =>
                        openStatusMenu(
                          event,
                          selectedDayIndex,
                          selectedDay.dayNumber,
                          commitment.id
                        )
                      }

                      aria-label={`Set ${commitment.label} status`}
                    >

                      <span className="habit-icon">

                        {completed ? (
                          <Check
                            size={12}
                            strokeWidth={2.2}
                          />
                        ) : (
                          <Circle
                            size={12}
                            strokeWidth={1.6}
                          />
                        )}

                      </span>

                      <span>
                        {commitment.label}
                      </span>

                    </button>

                  </div>
                );
              }
            )}

          </div>

        </div>

      </div>

      {/* =========================================
          STATUS POPUP
      ========================================= */}

      {statusMenu && (
        <div
          className="habit-status-menu"

          style={{
            left: statusMenu.x,
            top: statusMenu.y,
          }}

          onClick={(event) =>
            event.stopPropagation()
          }
        >

          <div className="habit-status-menu-title">
            Set status
          </div>

          {/* COMPLETED */}

          <button
            type="button"
            className="status-option completed-option"

            onClick={() =>
              setHabitStatus(
                statusMenu.dayNumber,
                statusMenu.habitId,
                "completed"
              )
            }
          >

            <span className="status-dot completed-dot" />

            <span>
              Completed
            </span>

          </button>

          {/* NOT COMPLETED */}

          <button
            type="button"
            className="status-option not-completed-option"

            onClick={() =>
              setHabitStatus(
                statusMenu.dayNumber,
                statusMenu.habitId,
                "not_completed"
              )
            }
          >

            <span className="status-dot not-completed-dot" />

            <span>
              Not Completed
            </span>

          </button>

        </div>
      )}

    </section>
  );
}

export default JourneyHeatmap;