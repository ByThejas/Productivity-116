import {
  Bell,
  CalendarDays,
  Clock3,
  Droplets,
  Flame,
  Target,
  Timer,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  loadJourneyConfig,
  parseStoredDate,
} from "../heatmap/heatmapUtils";

const FOCUS_STORAGE_KEY = "productivity-116-focus-v1";
const WATER_STORAGE_KEY = "productivity-116-water-v1";

function formatClock(date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDate(date) {
  return date.toLocaleDateString([], {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTimeRemaining() {
  const now = new Date();
  const tomorrow = new Date(now);

  tomorrow.setHours(24, 0, 0, 0);

  const remainingSeconds = Math.max(
    0,
    Math.floor((tomorrow - now) / 1000)
  );

  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor(
    (remainingSeconds % 3600) / 60
  );

  return `${hours}h ${minutes
    .toString()
    .padStart(2, "0")}m`;
}

function getJourneyInfo(now, journeyConfig) {
  const startDate = parseStoredDate(
    journeyConfig?.startDate
  );
  const endDate = parseStoredDate(
    journeyConfig?.endDate
  );

  if (!startDate || !endDate) {
    return {
      journeyDay: 1,
      totalDays: 1,
      progress: 0,
    };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date(now);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const totalDays =
    Math.max(
      1,
      Math.round((end - start) / 86400000) + 1
    );

  const elapsedDays =
    Math.floor((today - start) / 86400000) + 1;

  const journeyDay = Math.min(
    Math.max(elapsedDays, 1),
    totalDays
  );

  const progress = Math.min(
    100,
    Math.round(
      (journeyDay / totalDays) * 100
    )
  );

  return {
    journeyDay,
    totalDays,
    progress,
  };
}

function loadFocusSessions() {
  try {
    const saved = localStorage.getItem(
      FOCUS_STORAGE_KEY
    );

    if (!saved) return [];

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadWaterState() {
  try {
    const saved = localStorage.getItem(
      WATER_STORAGE_KEY
    );

    if (!saved) return {};

    const parsed = JSON.parse(saved);

    return parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function isToday(value) {
  if (!value) return false;

  const date = new Date(value);
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function TopNavigation() {
  const [now, setNow] = useState(
    () => new Date()
  );

  const [journeyConfig, setJourneyConfig] =
    useState(() => loadJourneyConfig());

  const [openPanel, setOpenPanel] =
    useState(null);

  const [focusSessions, setFocusSessions] =
    useState(() => loadFocusSessions());

  const [waterState, setWaterState] =
    useState(() => loadWaterState());

  useEffect(() => {
    const clockInterval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(clockInterval);
    };
  }, []);

  useEffect(() => {
    const refreshData = () => {
      setJourneyConfig(loadJourneyConfig());
      setFocusSessions(loadFocusSessions());
      setWaterState(loadWaterState());
    };

    const interval = window.setInterval(
      refreshData,
      5000
    );

    window.addEventListener(
      "journey-config-updated",
      refreshData
    );

    window.addEventListener(
      "focus-session-updated",
      refreshData
    );

    window.addEventListener(
      "storage",
      refreshData
    );

    return () => {
      window.clearInterval(interval);

      window.removeEventListener(
        "journey-config-updated",
        refreshData
      );

      window.removeEventListener(
        "focus-session-updated",
        refreshData
      );

      window.removeEventListener(
        "storage",
        refreshData
      );
    };
  }, []);

  const journeyInfo = useMemo(
    () =>
      getJourneyInfo(
        now,
        journeyConfig
      ),
    [now, journeyConfig]
  );

  const todayFocusSessions = useMemo(
    () =>
      focusSessions.filter((session) =>
        isToday(session.completedAt)
      ),
    [focusSessions]
  );

  const focusMinutes = todayFocusSessions.reduce(
    (total, session) =>
      total +
      Number(session.durationMinutes || 0),
    0
  );

  const todayWater = Number(
    waterState[journeyInfo.journeyDay] || 0
  );

  const waterLitres = (
    todayWater / 1000
  ).toFixed(1);

  const journeyComplete =
    journeyInfo.journeyDay >=
    journeyInfo.totalDays;

  function togglePanel(panel) {
    setOpenPanel((current) =>
      current === panel ? null : panel
    );
  }

  return (
    <header className="top-navigation">
      <div className="navigation-left">
        <div
          className="top-information"
          aria-label="Current information"
        >
          <div className="top-info-item top-info-time">
            <Clock3
              size={19}
              strokeWidth={1.7}
            />

            <div className="top-info-content">
              <strong>
                {formatClock(now)}
              </strong>

              <span>Local time</span>
            </div>
          </div>

          <div className="top-info-divider" />

          <div className="top-info-item">
            <CalendarDays
              size={19}
              strokeWidth={1.7}
            />

            <div className="top-info-content">
              <strong>
                {formatDate(now)}
              </strong>

              <span>Today</span>
            </div>
          </div>

          <div className="top-info-divider" />

          <div className="top-info-item">
            <div className="top-day-number">
              {journeyInfo.journeyDay}
            </div>

            <div className="top-info-content">
              <strong>
                Day {journeyInfo.journeyDay} /{" "}
                {journeyInfo.totalDays}
              </strong>

              <span>
                Journey progress
              </span>
            </div>
          </div>

          <div className="top-info-divider" />

          <div className="top-info-progress">
            <div className="top-progress-heading">
              <strong>
                {journeyInfo.progress}%
              </strong>

              <span>Complete</span>
            </div>

            <div className="top-progress-track">
              <span
                style={{
                  width: `${journeyInfo.progress}%`,
                }}
              />
            </div>
          </div>

          <div className="top-info-divider" />

          <div className="top-info-item top-info-remaining">
            <div className="top-status-dot" />

            <div className="top-info-content">
              <strong>
                {journeyComplete
                  ? "Journey complete"
                  : getTimeRemaining()}
              </strong>

              <span>
                {journeyComplete
                  ? "Final day"
                  : "Remaining today"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="navigation-right">
        <div className="top-action-wrapper">
          <button
            type="button"
            className={`nav-icon-button ${
              openPanel === "snapshot"
                ? "active"
                : ""
            }`}
            aria-label="Daily snapshot"
            title="Daily snapshot"
            onClick={() =>
              togglePanel("snapshot")
            }
          >
            <Target
              size={19}
              strokeWidth={1.7}
            />
          </button>

          {openPanel === "snapshot" && (
            <div className="top-popover">
              <div className="top-popover-header">
                <div>
                  <span className="top-popover-eyebrow">
                    TODAY
                  </span>

                  <h3>Daily Snapshot</h3>
                </div>

                <button
                  type="button"
                  className="top-popover-close"
                  aria-label="Close snapshot"
                  onClick={() =>
                    setOpenPanel(null)
                  }
                >
                  <X
                    size={16}
                    strokeWidth={1.7}
                  />
                </button>
              </div>

              <div className="snapshot-main">
                <div className="snapshot-day">
                  <strong>
                    {journeyInfo.journeyDay}
                  </strong>

                  <span>
                    DAY OF JOURNEY
                  </span>
                </div>

                <div className="snapshot-progress">
                  <div>
                    <span>Journey</span>
                    <strong>
                      {journeyInfo.progress}%
                    </strong>
                  </div>

                  <div className="snapshot-track">
                    <span
                      style={{
                        width: `${journeyInfo.progress}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="snapshot-grid">
                <div className="snapshot-stat">
                  <Clock3
                    size={16}
                    strokeWidth={1.7}
                  />

                  <div>
                    <strong>
                      {getTimeRemaining()}
                    </strong>

                    <span>
                      Time remaining
                    </span>
                  </div>
                </div>

                <div className="snapshot-stat">
                  <CalendarDays
                    size={16}
                    strokeWidth={1.7}
                  />

                  <div>
                    <strong>
                      {formatDate(now)}
                    </strong>

                    <span>
                      Current date
                    </span>
                  </div>
                </div>
              </div>

              <div className="snapshot-goal">
                <span>PRIMARY GOAL</span>

                <strong>
                  {journeyConfig?.primaryGoal
                    ?.name ||
                    journeyConfig?.primaryGoal ||
                    "Your journey goal"}
                </strong>
              </div>
            </div>
          )}
        </div>

        <div className="top-action-wrapper">
          <button
            type="button"
            className={`nav-icon-button ${
              openPanel === "activity"
                ? "active"
                : ""
            }`}
            aria-label="Activity and alerts"
            title="Activity and alerts"
            onClick={() =>
              togglePanel("activity")
            }
          >
            <Bell
              size={19}
              strokeWidth={1.7}
            />

            {(todayFocusSessions.length > 0 ||
              todayWater > 0) && (
              <span className="notification-dot" />
            )}
          </button>

          {openPanel === "activity" && (
            <div className="top-popover activity-popover">
              <div className="top-popover-header">
                <div>
                  <span className="top-popover-eyebrow">
                    ACTIVITY
                  </span>

                  <h3>Today's Activity</h3>
                </div>

                <button
                  type="button"
                  className="top-popover-close"
                  aria-label="Close activity"
                  onClick={() =>
                    setOpenPanel(null)
                  }
                >
                  <X
                    size={16}
                    strokeWidth={1.7}
                  />
                </button>
              </div>

              <div className="activity-list">
                <div className="activity-item">
                  <div className="activity-icon">
                    <Timer
                      size={17}
                      strokeWidth={1.7}
                    />
                  </div>

                  <div>
                    <strong>
                      {todayFocusSessions.length}{" "}
                      focus{" "}
                      {todayFocusSessions.length ===
                      1
                        ? "session"
                        : "sessions"}
                    </strong>

                    <span>
                      {focusMinutes > 0
                        ? `${focusMinutes} minutes focused today`
                        : "No focus time recorded yet"}
                    </span>
                  </div>
                </div>

                <div className="activity-item">
                  <div className="activity-icon">
                    <Droplets
                      size={17}
                      strokeWidth={1.7}
                    />
                  </div>

                  <div>
                    <strong>
                      {waterLitres} L hydration
                    </strong>

                    <span>
                      Water logged today
                    </span>
                  </div>
                </div>

                <div className="activity-item">
                  <div className="activity-icon">
                    <Flame
                      size={17}
                      strokeWidth={1.7}
                    />
                  </div>

                  <div>
                    <strong>
                      Day {journeyInfo.journeyDay}
                    </strong>

                    <span>
                      {journeyComplete
                        ? "You've reached the end of your journey"
                        : "Your journey is currently active"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default TopNavigation;