import { PartyPopper, X, 
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  CalendarDays,
  Plus,
  Sparkles,
  Target,
  Settings2,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";

import PageContainer from "../components/layout/PageContainer";
import GlassCard from "../components/ui/GlassCard";
import JourneyHeatmap from "../components/heatmap/JourneyHeatmap";
import DailyHabits from "../components/habits/DailyHabits";
import WaterTracker from "../components/habits/WaterTracker";
import TomorrowPlan from "../components/habits/TomorrowPlan";
import DailyTimeline from "../components/habits/DailyTimeline";
import FocusTimer from "../components/focus/FocusTimer";
import JourneySetup from "../components/journey/JourneySetup";
import JourneySettings from "../components/journey/JourneySettings";

import {
  getDayCompletion,
  loadJourneyConfig,
  getJourneyDuration,
  getJourneyCommitments,
  parseStoredDate,
} from "../components/heatmap/heatmapUtils";

import {
  checkCrossStateConsistency,
} from "../components/heatmap/stateIntegrity";

const STORAGE_KEY =
  "productivity-116-habits-v3";

const FOCUS_STORAGE_KEY =
  "productivity-116-focus-v1";


const MILESTONE_STATE_STORAGE_KEY =
  "productivity-journey-milestones-v1";

const DAY_TRANSITION_STORAGE_KEY =
  "productivity-journey-day-transition-v1";

const JOURNEY_COMPLETION_STORAGE_KEY =
  "productivity-journey-completion-v1";

function getJourneyCompletionKey(config) {
  return [
    config?.startDate || "",
    config?.endDate || "",
    config?.primaryGoal || "",
  ].join("|");
}

function loadJourneyCompletionState() {
  try {
    const saved = localStorage.getItem(
      JOURNEY_COMPLETION_STORAGE_KEY
    );

    if (!saved) return {};

    const parsed = JSON.parse(saved);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

function saveJourneyCompletionState(state) {
  try {
    localStorage.setItem(
      JOURNEY_COMPLETION_STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch {
    // Ignore storage errors.
  }
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDayTransitionJourneyKey(config) {
  return [
    config?.startDate || "",
    config?.endDate || "",
  ].join("|");
}

function loadDayTransitionState() {
  try {
    const saved = localStorage.getItem(
      DAY_TRANSITION_STORAGE_KEY
    );

    if (!saved) return {};

    const parsed = JSON.parse(saved);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

function saveDayTransitionState(state) {
  try {
    localStorage.setItem(
      DAY_TRANSITION_STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch {
    // Ignore storage errors.
  }
}


const MILESTONE_CELEBRATION_STYLES = `
  .milestone-celebration-overlay {
    position: fixed;
    inset: 0;
    z-index: 1200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(4, 6, 10, 0.62);
    backdrop-filter: blur(13px) saturate(115%);
    -webkit-backdrop-filter: blur(13px) saturate(115%);
    animation: milestoneOverlayIn 260ms cubic-bezier(.22,1,.36,1);
  }

  .milestone-celebration-card {
    position: relative;
    width: min(430px, 100%);
    overflow: hidden;
    padding: 32px 30px 30px;
    border: 1px solid rgba(255,255,255,.095);
    border-radius: 23px;
    background:
      radial-gradient(circle at 50% -15%, rgba(255,255,255,.075), transparent 42%),
      linear-gradient(145deg, rgba(255,255,255,.075), rgba(255,255,255,.022));
    box-shadow:
      0 32px 90px rgba(0,0,0,.44),
      0 8px 28px rgba(0,0,0,.18),
      inset 0 1px 0 rgba(255,255,255,.06);
    text-align: center;
    transform-origin: 50% 60%;
    animation: milestoneCardIn 420ms cubic-bezier(.16,1,.3,1);
  }

  .milestone-celebration-card::before {
    content: "";
    position: absolute;
    top: -90px;
    left: 50%;
    width: 220px;
    height: 180px;
    transform: translateX(-50%);
    border-radius: 50%;
    background: rgba(255,255,255,.035);
    filter: blur(28px);
    pointer-events: none;
  }

  .milestone-celebration-close {
    position: absolute;
    top: 14px;
    right: 14px;
    z-index: 2;
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255,255,255,.065);
    border-radius: 10px;
    background: rgba(255,255,255,.025);
    color: rgba(255,255,255,.48);
    cursor: pointer;
    transition:
      color 160ms ease,
      background 160ms ease,
      border-color 160ms ease,
      transform 160ms ease;
  }

  .milestone-celebration-close:hover {
    color: rgba(255,255,255,.78);
    background: rgba(255,255,255,.055);
    border-color: rgba(255,255,255,.11);
    transform: translateY(-1px);
  }

  .milestone-celebration-close:focus-visible,
  .milestone-celebration-action:focus-visible {
    outline: 2px solid rgba(255,255,255,.2);
    outline-offset: 3px;
  }

  .milestone-celebration-icon {
    position: relative;
    z-index: 1;
    width: 52px;
    height: 52px;
    margin: 0 auto 18px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255,255,255,.085);
    border-radius: 16px;
    background:
      linear-gradient(145deg, rgba(255,255,255,.075), rgba(255,255,255,.025));
    color: rgba(255,255,255,.86);
    box-shadow:
      0 12px 34px rgba(0,0,0,.2),
      inset 0 1px 0 rgba(255,255,255,.045);
    animation: milestoneIconIn 500ms 80ms cubic-bezier(.16,1,.3,1) both;
  }

  .milestone-celebration-icon svg {
    animation: milestoneIconFloat 2.8s 600ms ease-in-out infinite;
  }

  .milestone-celebration-card .eyebrow {
    position: relative;
    z-index: 1;
    letter-spacing: .08em;
  }

  .milestone-celebration-card h3 {
    position: relative;
    z-index: 1;
    margin: 8px 0 9px;
    font-size: 23px;
    line-height: 1.2;
    font-weight: 600;
    letter-spacing: -.025em;
    color: rgba(255,255,255,.93);
  }

  .milestone-celebration-card p {
    position: relative;
    z-index: 1;
    margin: 0 auto;
    max-width: 320px;
    color: rgba(255,255,255,.5);
    font-size: 13px;
    line-height: 1.65;
  }

  .milestone-celebration-action {
    position: relative;
    z-index: 1;
    width: 100%;
    min-height: 43px;
    margin-top: 23px;
    border: 1px solid rgba(255,255,255,.085);
    border-radius: 12px;
    background:
      linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.045));
    color: rgba(255,255,255,.84);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.035),
      0 6px 18px rgba(0,0,0,.1);
    transition:
      background 180ms ease,
      border-color 180ms ease,
      transform 180ms ease,
      box-shadow 180ms ease;
  }

  .milestone-celebration-action:hover {
    background:
      linear-gradient(180deg, rgba(255,255,255,.095), rgba(255,255,255,.055));
    border-color: rgba(255,255,255,.13);
    transform: translateY(-1px);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.045),
      0 9px 24px rgba(0,0,0,.14);
  }

  .milestone-celebration-action:active {
    transform: translateY(0);
  }

  @keyframes milestoneOverlayIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes milestoneCardIn {
    from {
      opacity: 0;
      transform: translateY(16px) scale(.975);
    }
    60% {
      opacity: 1;
      transform: translateY(-2px) scale(1.003);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes milestoneIconIn {
    from {
      opacity: 0;
      transform: translateY(7px) scale(.88);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes milestoneIconFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
  }

  @media (prefers-reduced-motion: reduce) {
    .milestone-celebration-overlay,
    .milestone-celebration-card,
    .milestone-celebration-icon,
    .milestone-celebration-icon svg {
      animation: none;
    }

    .milestone-celebration-close,
    .milestone-celebration-action {
      transition: none;
    }
  }

  @media (max-width: 520px) {
    .milestone-celebration-overlay {
      padding: 18px;
    }

    .milestone-celebration-card {
      padding: 28px 21px 22px;
      border-radius: 19px;
    }

    .milestone-celebration-card h3 {
      font-size: 21px;
    }

    .milestone-celebration-icon {
      width: 49px;
      height: 49px;
      margin-bottom: 16px;
    }

    .milestone-celebration-action {
      margin-top: 21px;
    }
  }

  .day-transition-notice {
    position: fixed;
    top: 20px;
    left: 50%;
    z-index: 1100;
    width: min(460px, calc(100vw - 32px));
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 14px 15px 14px 17px;
    border: 1px solid rgba(255,255,255,.085);
    border-radius: 15px;
    background:
      linear-gradient(145deg, rgba(255,255,255,.075), rgba(255,255,255,.025));
    box-shadow:
      0 18px 55px rgba(0,0,0,.28),
      inset 0 1px 0 rgba(255,255,255,.05);
    backdrop-filter: blur(18px) saturate(115%);
    -webkit-backdrop-filter: blur(18px) saturate(115%);
    animation: dayTransitionIn 360ms cubic-bezier(.16,1,.3,1);
  }

  .day-transition-copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .day-transition-copy strong {
    color: rgba(255,255,255,.88);
    font-size: 13px;
    font-weight: 600;
  }

  .day-transition-copy > span:last-child {
    color: rgba(255,255,255,.43);
    font-size: 11px;
    line-height: 1.4;
  }

  .day-transition-dismiss {
    flex: 0 0 auto;
    min-height: 34px;
    padding: 0 11px;
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 9px;
    background: rgba(255,255,255,.035);
    color: rgba(255,255,255,.55);
    font-size: 11px;
    cursor: pointer;
    transition:
      background 160ms ease,
      color 160ms ease,
      border-color 160ms ease;
  }

  .day-transition-dismiss:hover {
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.11);
    color: rgba(255,255,255,.78);
  }

  @keyframes dayTransitionIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-10px) scale(.985);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .day-transition-notice {
      animation: none;
    }

    .day-transition-dismiss {
      transition: none;
    }
  }

  @media (max-width: 520px) {
    .day-transition-notice {
      top: 12px;
      width: calc(100vw - 24px);
      gap: 12px;
      padding: 13px;
      border-radius: 13px;
    }

    .day-transition-dismiss {
      min-height: 32px;
      padding: 0 9px;
    }
  }
`;

function getMilestoneJourneyKey(config) {
  return [
    config?.startDate || "",
    config?.endDate || "",
    (config?.primaryGoal || "").trim(),
  ].join("|");
}

function loadMilestoneState() {
  try {
    const saved = localStorage.getItem(MILESTONE_STATE_STORAGE_KEY);

    if (!saved) return {};

    const parsed = JSON.parse(saved);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

function saveMilestoneState(state) {
  try {
    localStorage.setItem(
      MILESTONE_STATE_STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch {
    // Ignore storage errors.
  }
}


function markMilestoneCelebrated(state, journeyKey, day) {
  const currentJourneyState = state[journeyKey] || {
    reached: [],
    celebrated: [],
  };

  const celebrated = Array.isArray(currentJourneyState.celebrated)
    ? currentJourneyState.celebrated.map(String)
    : [];

  if (celebrated.includes(String(day))) {
    return state;
  }

  const nextState = {
    ...state,
    [journeyKey]: {
      reached: Array.isArray(currentJourneyState.reached)
        ? currentJourneyState.reached.map(String)
        : [],
      celebrated: [...celebrated, String(day)],
    },
  };

  saveMilestoneState(nextState);
  return nextState;
}

function getJourneyDayNumber(config, totalDays) {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const start = parseStoredDate(config?.startDate);
  const end = parseStoredDate(config?.endDate);

  if (!start || !end || totalDays <= 0) {
    return 1;
  }

  if (today < start) {
    return 1;
  }

  if (today > end) {
    return totalDays;
  }

  return Math.min(
    Math.max(
      Math.round(
        (today - start) /
          (1000 * 60 * 60 * 24)
      ) + 1,
      1
    ),
    totalDays
  );
}

function createBlankHabitState(commitments) {
  return commitments.reduce(
    (state, commitment) => {
      state[commitment.id] = null;

      return state;
    },
    {}
  );
}

function loadHabitState() {
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

function loadFocusSessions() {
  try {
    const saved =
      localStorage.getItem(
        FOCUS_STORAGE_KEY
      );

    if (!saved) {
      return [];
    }

    const sessions =
      JSON.parse(saved);

    if (!Array.isArray(sessions)) {
      return [];
    }

    return sessions;
  } catch (error) {
    console.error(
      "Unable to load focus sessions:",
      error
    );

    return [];
  }
}

function getJourneyDate(dayNumber, config) {
  const startDate =
    parseStoredDate(config?.startDate);

  const date = startDate
    ? new Date(startDate)
    : new Date();

  date.setDate(
    date.getDate() +
      (dayNumber - 1)
  );

  return date;
}

function formatJourneyDate(dayNumber, config) {
  const date =
    getJourneyDate(
      dayNumber,
      config
    );

  return {
    day: date
      .getDate()
      .toString()
      .padStart(2, "0"),

    month: date.toLocaleString(
      "en-US",
      {
        month: "short",
      }
    ),
  };
}

function isSameCalendarDay(
  date,
  targetDate
) {

  return (
    date.getFullYear() ===
      targetDate.getFullYear() &&
    date.getMonth() ===
      targetDate.getMonth() &&
    date.getDate() ===
      targetDate.getDate()
  );
}

function Overview() {
  const [
    journeyState,
    setJourneyState,
  ] = useState(loadHabitState);

  const [journeyConfig, setJourneyConfig] = useState(
    loadJourneyConfig
  );

  /*
    Phase 10A-5:
    Cross-state consistency check.

    This is intentionally read-only.
    It does not repair, migrate, or delete data.
  */
  useEffect(() => {
    const integrityReport =
      checkCrossStateConsistency(journeyConfig);

    if (!integrityReport.ok) {
      console.warn(
        "[Journey Integrity] Inconsistencies detected:",
        integrityReport.issues
      );
    }

    if (integrityReport.warnings.length > 0) {
      console.info(
        "[Journey Integrity] Warnings:",
        integrityReport.warnings
      );
    }
  }, [journeyConfig]);

  const [showJourneySettings, setShowJourneySettings] =
    useState(false);

  const [
    focusSessions,
    setFocusSessions,
  ] = useState(loadFocusSessions);

  const commitments =
    getJourneyCommitments(journeyConfig);

  const totalJourneyDays =
    getJourneyDuration(journeyConfig) || 1;

  const actualJourneyDay =
    getJourneyDayNumber(
      journeyConfig,
      totalJourneyDays
    );

  const [
    viewDayNumber,
    setViewDayNumber,
  ] = useState(
    actualJourneyDay
  );

  /*
    Keep the selected dashboard day
    synchronized with the heatmap.
  */

  useEffect(() => {
    function handleHabitStateUpdate() {
      setJourneyState(
        loadHabitState()
      );
    }

    function handleJourneyConfigUpdate() {
      const updatedConfig = loadJourneyConfig();
      setJourneyConfig(updatedConfig);
      setShowJourneySettings(false);
      const updatedTotalDays =
        getJourneyDuration(updatedConfig) || 1;
      setViewDayNumber(
        getJourneyDayNumber(
          updatedConfig,
          updatedTotalDays
        )
      );
    }

    function handleJourneyDaySelected(
      event
    ) {
      const dayNumber =
        event.detail?.dayNumber;

      if (
        typeof dayNumber !==
        "number"
      ) {
        return;
      }

      setViewDayNumber(
        Math.min(
          Math.max(
            dayNumber,
            1
          ),
          totalJourneyDays
        )
      );
    }

    window.addEventListener(
      "habit-state-updated",
      handleHabitStateUpdate
    );

    window.addEventListener(
      "journey-day-selected",
      handleJourneyDaySelected
    );

    window.addEventListener(
      "journey-config-updated",
      handleJourneyConfigUpdate
    );


  return () => {
      window.removeEventListener(
        "habit-state-updated",
        handleHabitStateUpdate
      );

      window.removeEventListener(
        "journey-day-selected",
        handleJourneyDaySelected
      );

      window.removeEventListener(
        "journey-config-updated",
        handleJourneyConfigUpdate
      );
    };
  }, [totalJourneyDays]);

  /*
    Phase 8D:
    Day transition.

    When a new calendar day begins, the dashboard automatically
    returns to the current journey day. A small notice confirms
    the transition without interrupting the workflow.
  */

  const [dayTransitionState, setDayTransitionState] = useState(
    loadDayTransitionState
  );

  const [dayTransitionNotice, setDayTransitionNotice] = useState(null);

  const dayTransitionJourneyKey = useMemo(
    () => getDayTransitionJourneyKey(journeyConfig),
    [journeyConfig]
  );

  useEffect(() => {
    if (!dayTransitionJourneyKey) return undefined;

    const currentDateKey = getLocalDateKey();
    const lastSeenDate =
      dayTransitionState[dayTransitionJourneyKey];

    if (!lastSeenDate) {
      const nextState = {
        ...dayTransitionState,
        [dayTransitionJourneyKey]: currentDateKey,
      };

      setDayTransitionState(nextState);
      saveDayTransitionState(nextState);
      return undefined;
    }

    function checkForNewDay() {
      const nextDateKey = getLocalDateKey();

      if (nextDateKey === lastSeenDate) return;

      const nextState = {
        ...dayTransitionState,
        [dayTransitionJourneyKey]: nextDateKey,
      };

      setDayTransitionState(nextState);
      saveDayTransitionState(nextState);

      const nextJourneyDay = getJourneyDayNumber(
        journeyConfig,
        totalJourneyDays
      );

      if (nextJourneyDay !== actualJourneyDay) {
        setViewDayNumber(nextJourneyDay);
      }

      if (
        nextJourneyDay !== actualJourneyDay &&
        nextJourneyDay > 1 &&
        nextJourneyDay <= totalJourneyDays
      ) {
        setDayTransitionNotice({
          dayNumber: nextJourneyDay,
        });
      }
    }

    const interval = window.setInterval(
      checkForNewDay,
      30000
    );

    checkForNewDay();

    return () => {
      window.clearInterval(interval);
    };
  }, [
    actualJourneyDay,
    dayTransitionJourneyKey,
    dayTransitionState,
    journeyConfig,
    totalJourneyDays,
  ]);

  useEffect(() => {
    if (!dayTransitionNotice) return undefined;

    const timeout = window.setTimeout(() => {
      setDayTransitionNotice(null);
    }, 6500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [dayTransitionNotice]);

  function dismissDayTransition() {
    setDayTransitionNotice(null);
  }

  /*
    Keep focus statistics updated
    whenever a session is completed.
  */

  useEffect(() => {
    function handleFocusSessionUpdate() {
      setFocusSessions(
        loadFocusSessions()
      );
    }

    window.addEventListener(
      "focus-session-updated",
      handleFocusSessionUpdate
    );

    return () => {
      window.removeEventListener(
        "focus-session-updated",
        handleFocusSessionUpdate
      );
    };
  }, []);

  /*
    Selected journey day.
  */

  const currentDay =
    journeyState[
      viewDayNumber
    ] ||
    createBlankHabitState(commitments);

  const completedCount =
    getDayCompletion(
      currentDay,
      commitments
    );

  const completionPercentage =
    commitments.length === 0
      ? 0
      : Math.round(
          (completedCount /
            commitments.length) *
            100
        );

  const dayScore =
    completionPercentage;

  /*
    Phase 5C:
    Habit performance across the
    entire journey.

    Each habit receives a count of
    how many journey days it has
    been completed.
  */

  const habitPerformance =
    useMemo(() => {
      return commitments.map(
        (habit) => {
          const completedDays =
            Array.from(
              { length: totalJourneyDays },
              (_, index) =>
                index + 1
            ).filter(
              (dayNumber) =>
                journeyState[
                  dayNumber
                ]?.[habit.id] === true
            ).length;

          const percentage =
            Math.round(
              (completedDays /
                totalJourneyDays) *
                100
            );

          return {
            ...habit,
            completedDays,
            percentage,
          };
        }
      );
    }, [journeyState]);

  /*
    Phase 5D:
    Habit consistency intelligence.

    Current streak is the number of consecutive
    completed days ending at the latest completed
    journey day. Best streak is the longest run
    of completed days across the journey.
  */

  const habitConsistency = useMemo(() => {
    return commitments.map((habit) => {
      let currentStreak = 0;
      let bestStreak = 0;
      let runningStreak = 0;

      for (let dayNumber = 1; dayNumber <= totalJourneyDays; dayNumber += 1) {
        const completed =
          journeyState[dayNumber]?.[habit.id] === true;

        if (completed) {
          runningStreak += 1;
          bestStreak = Math.max(
            bestStreak,
            runningStreak
          );
        } else {
          runningStreak = 0;
        }
      }

      for (
        let dayNumber = totalJourneyDays;
        dayNumber >= 1;
        dayNumber -= 1
      ) {
        if (
          journeyState[dayNumber]?.[habit.id] === true
        ) {
          currentStreak += 1;
        } else {
          break;
        }
      }

      return {
        ...habit,
        currentStreak,
        bestStreak,
      };
    });
  }, [journeyState]);

  const overallConsistency = useMemo(() => {
    if (commitments.length === 0) return 0;

    const totalPossible =
      totalJourneyDays * commitments.length;

    const totalCompleted = habitPerformance.reduce(
      (total, habit) =>
        total + habit.completedDays,
      0
    );

    return Math.round(
      (totalCompleted / totalPossible) * 100
    );
  }, [habitPerformance]);

  const strongestConsistencyHabit = useMemo(() => {
    if (habitConsistency.length === 0) return null;

    return habitConsistency.reduce(
      (strongest, habit) =>
        habit.currentStreak >
        strongest.currentStreak
          ? habit
          : strongest
    );
  }, [habitConsistency]);

  const longestHabitStreak = useMemo(() => {
    if (habitConsistency.length === 0) return 0;

    return Math.max(
      ...habitConsistency.map(
        (habit) => habit.bestStreak
      )
    );
  }, [habitConsistency]);

  /*
    Phase 5E:
    Journey analytics.

    A completed day has all four habits completed.
    A partial day has at least one completed habit but
    is not fully complete. An untouched day has no
    completed habits.
  */

  const journeyAnalytics = useMemo(() => {
    const days = Array.from(
      { length: totalJourneyDays },
      (_, index) => index + 1
    );

    const dayStats = days.map((dayNumber) => {
      const dayState = journeyState[dayNumber] || {};
      const completed = getDayCompletion(dayState, commitments);

      return {
        dayNumber,
        completed,
        isComplete: completed === commitments.length,
        isPartial: completed > 0 && completed < commitments.length,
        isUntouched: completed === 0,
      };
    });

    const completedDays = dayStats.filter(
      (day) => day.isComplete
    ).length;

    const partialDays = dayStats.filter(
      (day) => day.isPartial
    ).length;

    const untouchedDays = dayStats.filter(
      (day) => day.isUntouched
    ).length;

    const trackedDays =
      completedDays + partialDays;

    const completedPercentage = Math.round(
      (completedDays / totalJourneyDays) * 100
    );

    const weeklyTrend = [];

    for (
      let startDay = 1;
      startDay <= totalJourneyDays;
      startDay += 7
    ) {
      const endDay = Math.min(
        startDay + 6,
        totalJourneyDays
      );

      const weekDays = dayStats.filter(
        (day) =>
          day.dayNumber >= startDay &&
          day.dayNumber <= endDay
      );

      const completedCount = weekDays.filter(
        (day) => day.isComplete
      ).length;

      const averageCompletion = Math.round(
        (weekDays.reduce(
          (total, day) =>
            total + day.completed,
          0
        ) /
          (weekDays.length * commitments.length)) *
          100
      );

      weeklyTrend.push({
        week: weeklyTrend.length + 1,
        startDay,
        endDay,
        completedDays: completedCount,
        averageCompletion,
      });
    }

    const strongestWeek =
      weeklyTrend.reduce(
        (strongest, week) =>
          week.averageCompletion >
          strongest.averageCompletion
            ? week
            : strongest,
        weeklyTrend[0] || {
          week: 0,
          startDay: 0,
          endDay: 0,
          completedDays: 0,
          averageCompletion: 0,
        }
      );

    const weakestWeek =
      weeklyTrend.reduce(
        (weakest, week) =>
          week.averageCompletion <
          weakest.averageCompletion
            ? week
            : weakest,
        weeklyTrend[0] || {
          week: 0,
          startDay: 0,
          endDay: 0,
          completedDays: 0,
          averageCompletion: 0,
        }
      );

    return {
      completedDays,
      partialDays,
      untouchedDays,
      trackedDays,
      completedPercentage,
      weeklyTrend,
      strongestWeek,
      weakestWeek,
    };
  }, [journeyState, commitments, totalJourneyDays]);

  /*
    Strongest and weakest habits.

    In case of a tie, the original
    habit order is preserved.
  */

  const strongestHabit =
    useMemo(() => {
      if (
        habitPerformance.length ===
        0
      ) {
        return null;
      }

      return habitPerformance.reduce(
        (strongest, habit) =>
          habit.completedDays >
          strongest.completedDays
            ? habit
            : strongest
      );
    }, [habitPerformance]);

  const weakestHabit =
    useMemo(() => {
      if (
        habitPerformance.length ===
        0
      ) {
        return null;
      }

      return habitPerformance.reduce(
        (weakest, habit) =>
          habit.completedDays <
          weakest.completedDays
            ? habit
            : weakest
      );
    }, [habitPerformance]);

  /*
    Today's / selected day's
    habit breakdown.

    This gives us a simple status
    object for future performance
    UI without duplicating logic.
  */

  const dailyPerformance =
    useMemo(() => {
      return commitments.map(
        (habit) => ({
          ...habit,
          completed:
            currentDay[
              habit.id
            ] === true,
          notCompleted:
            currentDay[
              habit.id
            ] === false,
          pending:
            currentDay[
              habit.id
            ] === null ||
            currentDay[
              habit.id
            ] === undefined,
        })
      );
    }, [currentDay]);

  const completedDailyHabits =
    dailyPerformance.filter(
      (habit) => habit.completed
    ).length;

  const pendingDailyHabits =
    dailyPerformance.filter(
      (habit) => habit.pending
    ).length;

  const missedDailyHabits =
    dailyPerformance.filter(
      (habit) => habit.notCompleted
    ).length;

  /*
    Focus sessions belonging to
    the selected journey day.

    Sessions are matched through
    their completedAt date.
  */

  const selectedJourneyDate =
    getJourneyDate(
      viewDayNumber,
      journeyConfig
    );

  const selectedFocusSessions =
    focusSessions.filter(
      (session) => {
        if (!session.completedAt) {
          return false;
        }

        const completedDate =
          new Date(
            session.completedAt
          );

        return isSameCalendarDay(
          completedDate,
          selectedJourneyDate
        );
      }
    );

  const focusMinutes =
    selectedFocusSessions.reduce(
      (total, session) =>
        total +
        Number(
          session.durationMinutes ||
            0
        ),
      0
    );

  const focusSessionCount =
    selectedFocusSessions.length;

  const viewDate =
    formatJourneyDate(
      viewDayNumber,
      journeyConfig
    );

  /*
    Day navigation.
  */

  function goToPreviousDay() {
    setViewDayNumber(
      (previous) =>
        Math.max(
          previous - 1,
          1
        )
    );
  }

  function goToNextDay() {
    setViewDayNumber(
      (previous) =>
        Math.min(
          previous + 1,
          totalJourneyDays
        )
    );
  }

  function getScoreMessage() {
    if (dayScore === 100) {
      return "Perfect day. Keep it going.";
    }

    if (dayScore >= 75) {
      return "Strong day. Finish what remains.";
    }

    if (dayScore >= 50) {
      return "Good progress. Stay consistent.";
    }

    if (dayScore > 0) {
      return "You're moving. Keep going.";
    }

    return "Let's get started.";
  }

  /*
    Phase 7E:
    Behavioral intelligence.

    These signals use only elapsed journey days so
    future days do not distort the interpretation.
  */


  /*
    Phase 7G:
    Personal coach guidance.

    This turns the current journey state into one
    practical priority without changing any existing
    completion or analytics calculations.
  */

  const coachGuidance = useMemo(() => {
    const incompleteToday = dailyPerformance.filter(
      (commitment) => !commitment.completed
    );

    const pendingToday = dailyPerformance.filter(
      (commitment) => commitment.pending
    );

    const explicitMissesToday = dailyPerformance.filter(
      (commitment) => commitment.notCompleted
    );

    const priorityPool =
      pendingToday.length > 0
        ? pendingToday
        : incompleteToday;

    const weakestPriority =
      priorityPool.length > 0
        ? priorityPool.reduce((weakest, commitment) => {
            const currentPerformance =
              habitPerformance.find(
                (habit) => habit.id === commitment.id
              );

            const weakestPerformance =
              habitPerformance.find(
                (habit) => habit.id === weakest.id
              );

            const currentPercentage =
              currentPerformance?.percentage ?? 0;

            const weakestPercentage =
              weakestPerformance?.percentage ?? 0;

            return currentPercentage <
              weakestPercentage
              ? commitment
              : weakest;
          })
        : null;

    const elapsedDays = Math.min(
      Math.max(actualJourneyDay, 1),
      totalJourneyDays
    );

    const currentDayScore = dayScore;

    let recoverySignal = "No recovery pattern yet";

    if (elapsedDays > 1) {
      const previousDayScore = getDayCompletion(
        journeyState[elapsedDays - 1] || {},
        commitments
      );

      const previousDayPercentage =
        commitments.length === 0
          ? 0
          : Math.round(
              (previousDayScore / commitments.length) * 100
            );

      if (
        currentDayScore > 0 &&
        previousDayPercentage === 0
      ) {
        recoverySignal = "Recovered today";
      }
    }

    const journeyStage =
      elapsedDays >= 30
        ? "Long-term pattern"
        : elapsedDays >= 14
          ? "Pattern established"
          : elapsedDays >= 7
            ? "Pattern forming"
            : "Foundation";

    let priority = "Protect the win";
    let reason =
      "Every completed commitment strengthens the routine you are building.";
    let note =
      "You've completed today's commitments. Use the rest of the day to protect the routine rather than adding more.";

    if (priorityPool.length > 0 && weakestPriority) {
      priority = `Complete ${weakestPriority.label}`;

      const priorityPerformance =
        habitPerformance.find(
          (habit) => habit.id === weakestPriority.id
        );

      const percentage =
        priorityPerformance?.percentage ?? 0;

      reason =
        percentage === 0
          ? `${weakestPriority.label} has no completed days yet, so it is the clearest place to start.`
          : `${weakestPriority.label} is currently at ${percentage}% completion, making it the clearest opportunity to strengthen.`;

      if (recoverySignal === "Recovered today") {
        note =
          "You are already showing a recovery signal. Finish this commitment to turn recovery into momentum.";
      } else if (explicitMissesToday.length > 0) {
        note =
          "Don't try to rescue the whole day at once. Complete this one commitment first, then reassess.";
      } else if (journeyStage === "Foundation") {
        note =
          "You're still building your baseline. One deliberate completion is more valuable than chasing a perfect day.";
      } else {
        note =
          "Keep the next action small and concrete. Completing this one commitment gives the rest of the day a better chance.";
      }
    } else if (dailyPerformance.length === 0) {
      priority = "Define your first commitment";
      reason =
        "Your journey needs at least one daily commitment before the coach can guide the day.";
      note =
        "Add a commitment in Edit Journey, then come back here to build your routine.";
    } else if (completedDailyHabits === dailyPerformance.length) {
      priority = "Protect the win";
      reason =
        "You completed every commitment for this day.";
      note =
        "A complete day is the signal to repeat the routine, not to make it harder.";
    }

    return {
      priority,
      reason,
      note,
      pendingCount: pendingToday.length,
      incompleteCount: incompleteToday.length,
    };
  }, [
    dailyPerformance,
    habitPerformance,
    completedDailyHabits,
    actualJourneyDay,
    totalJourneyDays,
    dayScore,
    journeyState,
    commitments,
  ]);

  /*
    Phase 8A:
    Dynamic journey progress.

    Progress is based on the configured journey dates rather
    than a fixed 116-day journey. Future days are not treated
    as failures.
  */

  const [journeyCompletionState, setJourneyCompletionState] =
    useState(loadJourneyCompletionState);

  const journeyCompletionKey = useMemo(
    () => getJourneyCompletionKey(journeyConfig),
    [journeyConfig]
  );

  const [showJourneyCompletion, setShowJourneyCompletion] = useState(false);
  const completedJourneyRecord = journeyCompletionState?.[journeyCompletionKey] || null;
  const journeyHasBeenCompleted = Boolean(completedJourneyRecord?.completedAt);


  useEffect(() => {
    const completion = journeyCompletionState?.[journeyCompletionKey];

    if (!completion?.completedAt || completion?.acknowledged) {
      setShowJourneyCompletion(false);
      return;
    }

    setShowJourneyCompletion(true);
  }, [journeyCompletionState, journeyCompletionKey]);

  function dismissJourneyCompletion() {
    setJourneyCompletionState((previous) => {
      const current = previous?.[journeyCompletionKey] || {};

      const nextState = {
        ...previous,
        [journeyCompletionKey]: {
          ...current,
          acknowledged: true,
        },
      };

      saveJourneyCompletionState(nextState);
      return nextState;
    });

    setShowJourneyCompletion(false);
  }


  const journeyProgress = useMemo(() => {
    const start = parseStoredDate(journeyConfig.startDate);
    const end = parseStoredDate(journeyConfig.endDate);
    const today = new Date();

    if (!start || !end || end < start) {
      return {
        elapsedDays: 0,
        remainingDays: 0,
        percentage: 0,
        isBeforeJourney: false,
        isComplete: false,
      };
    }

    const totalDays = getJourneyDuration(journeyConfig);

    const startDay = new Date(start);
    startDay.setHours(0, 0, 0, 0);

    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);

    const currentDay = new Date(today);
    currentDay.setHours(0, 0, 0, 0);

    if (currentDay < startDay) {
      return {
        elapsedDays: 0,
        remainingDays: totalDays,
        percentage: 0,
        isBeforeJourney: true,
        isComplete: false,
      };
    }

    if (currentDay >= endDay) {
      return {
        elapsedDays: totalDays,
        remainingDays: 0,
        percentage: 100,
        isBeforeJourney: false,
        isComplete: true,
      };
    }

    const elapsedDays =
      Math.floor(
        (currentDay.getTime() - startDay.getTime()) /
          86400000
      ) + 1;

    const remainingDays = Math.max(
      totalDays - elapsedDays,
      0
    );

    return {
      elapsedDays,
      remainingDays,
      percentage: Math.min(
        Math.round((elapsedDays / totalDays) * 100),
        100
      ),
      isBeforeJourney: false,
      isComplete: false,
    };
  }, [journeyConfig]);

  /*
    Phase 8E-1:
    Journey completion detection and persistence.

    Completion is recorded once the configured journey reaches
    its final calendar day. Existing journey history remains
    untouched; completion is stored separately and keyed to
    the current journey configuration.
  */

  useEffect(() => {
    if (!journeyCompletionKey || !journeyProgress.isComplete) {
      return;
    }

    if (journeyCompletionState[journeyCompletionKey]?.completedAt) {
      return;
    }

    const nextState = {
      ...journeyCompletionState,
      [journeyCompletionKey]: {
        completedAt: new Date().toISOString(),
      },
    };

    setJourneyCompletionState(nextState);
    saveJourneyCompletionState(nextState);
  }, [
    journeyCompletionKey,
    journeyCompletionState,
    journeyProgress.isComplete,
  ]);


  /*
    Phase 8B:
    Dynamic journey milestones.

    Milestones are derived from the configured journey length.
    Duplicate positions are removed so short journeys stay compact.
  */

  const journeyMilestones = useMemo(() => {
    const totalDays = getJourneyDuration(journeyConfig);

    if (!totalDays || totalDays <= 0) {
      return [];
    }

    const candidates = [
      { day: 7, label: "First week" },
      { day: 14, label: "Two weeks" },
      { day: 30, label: "One month" },
      {
        day: Math.ceil(totalDays * 0.5),
        label: "Halfway",
      },
      {
        day: Math.ceil(totalDays * 0.75),
        label: "75% complete",
      },
      {
        day: Math.max(
          totalDays - 7,
          Math.ceil(totalDays * 0.9)
        ),
        label: "Final stretch",
      },
      {
        day: totalDays,
        label: "Journey complete",
      },
    ];

    const seenDays = new Set();

    return candidates
      .filter((milestone) => {
        if (
          milestone.day < 1 ||
          milestone.day > totalDays ||
          seenDays.has(milestone.day)
        ) {
          return false;
        }

        seenDays.add(milestone.day);
        return true;
      })
      .map((milestone) => ({
        ...milestone,
        reached:
          journeyProgress.isComplete ||
          journeyProgress.elapsedDays >= milestone.day,
        current:
          !journeyProgress.isComplete &&
          journeyProgress.elapsedDays === milestone.day,
      }));
  }, [
    journeyConfig,
    journeyProgress.elapsedDays,
    journeyProgress.isComplete,
  ]);

  /*
    Phase 8C-1:
    Persist which milestones have been reached.

    This is intentionally functional only:
    - reached milestones survive refreshes
    - a new journey gets a new storage namespace
    - celebration/acknowledgement is kept separate for 8C-2
  */

  const [milestoneState, setMilestoneState] = useState(
    loadMilestoneState
  );

  const milestoneJourneyKey = useMemo(
    () => getMilestoneJourneyKey(journeyConfig),
    [journeyConfig]
  );

  const reachedMilestoneDays = useMemo(
    () =>
      journeyMilestones
        .filter((milestone) => milestone.reached)
        .map((milestone) => String(milestone.day)),
    [journeyMilestones]
  );

  useEffect(() => {
    const styleId = "milestone-celebration-styles";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = MILESTONE_CELEBRATION_STYLES;
    document.head.appendChild(style);

    return () => {
      const existing = document.getElementById(styleId);
      if (existing) existing.remove();
    };
  }, []);

  useEffect(() => {
    if (!milestoneJourneyKey) return;

    const existingJourneyState =
      milestoneState[milestoneJourneyKey] || {
        reached: [],
        celebrated: [],
      };

    const currentReached = Array.isArray(existingJourneyState.reached)
      ? existingJourneyState.reached.map(String)
      : [];

    const currentCelebrated = Array.isArray(
      existingJourneyState.celebrated
    )
      ? existingJourneyState.celebrated.map(String)
      : [];

    const nextReached = Array.from(
      new Set([...currentReached, ...reachedMilestoneDays])
    );

    const reachedChanged =
      nextReached.length !== currentReached.length ||
      nextReached.some((day) => !currentReached.includes(day));

    if (!reachedChanged) return;

    const nextState = {
      ...milestoneState,
      [milestoneJourneyKey]: {
        reached: nextReached,
        celebrated: currentCelebrated.filter((day) =>
          nextReached.includes(day)
        ),
      },
    };

    setMilestoneState(nextState);
    saveMilestoneState(nextState);
  }, [
    milestoneJourneyKey,
    milestoneState,
    reachedMilestoneDays,
  ]);


  /*
    Phase 8C-2:
    Show one premium, dismissible celebration for the earliest
    reached milestone that has not been celebrated yet.
  */

  const [celebrationMilestone, setCelebrationMilestone] = useState(null);

  const pendingCelebrationMilestone = useMemo(() => {
    const journeyState = milestoneState[milestoneJourneyKey];

    if (!journeyState) return null;

    const celebrated = Array.isArray(journeyState.celebrated)
      ? journeyState.celebrated.map(String)
      : [];

    return (
      journeyMilestones.find(
        (milestone) =>
          milestone.reached &&
          !celebrated.includes(String(milestone.day))
      ) || null
    );
  }, [
    milestoneState,
    milestoneJourneyKey,
    journeyMilestones,
  ]);

  useEffect(() => {
    if (!pendingCelebrationMilestone) {
      setCelebrationMilestone(null);
      return;
    }

    setCelebrationMilestone(pendingCelebrationMilestone);
  }, [pendingCelebrationMilestone]);

  function dismissMilestoneCelebration() {
    if (!celebrationMilestone) return;

    setMilestoneState((previous) =>
      markMilestoneCelebrated(
        previous,
        milestoneJourneyKey,
        celebrationMilestone.day
      )
    );

    setCelebrationMilestone(null);
  }

  const behaviorIntelligence = useMemo(() => {
    const elapsedDays = Math.min(
      Math.max(actualJourneyDay, 1),
      totalJourneyDays
    );

    const getCompletionPercentage = (dayNumber) => {
      if (commitments.length === 0) return 0;

      const completed = getDayCompletion(
        journeyState[dayNumber] || {},
        commitments
      );

      return Math.round(
        (completed / commitments.length) * 100
      );
    };

    const dayScores = Array.from(
      { length: elapsedDays },
      (_, index) =>
        getCompletionPercentage(index + 1)
    );

    const recentWindowSize = Math.min(
      7,
      elapsedDays
    );

    const recentScores = dayScores.slice(
      -recentWindowSize
    );

    const hasReliableComparison =
      elapsedDays >= 14;

    const previousEnd =
      Math.max(
        elapsedDays - recentWindowSize,
        0
      );

    const previousStart =
      Math.max(
        previousEnd - recentWindowSize,
        0
      );

    const previousScores = hasReliableComparison
      ? dayScores.slice(
          previousStart,
          previousEnd
        )
      : [];

    let journeyStage = "Foundation";
    let signalConfidence = "Early signal";

    if (elapsedDays >= 30) {
      journeyStage = "Long-term pattern";
      signalConfidence = "Strong signal";
    } else if (elapsedDays >= 14) {
      journeyStage = "Pattern established";
      signalConfidence = "Reliable signal";
    } else if (elapsedDays >= 7) {
      journeyStage = "Pattern forming";
      signalConfidence = "Emerging signal";
    }

    const average = (scores) =>
      scores.length === 0
        ? 0
        : Math.round(
            scores.reduce(
              (total, score) =>
                total + score,
              0
            ) / scores.length
          );

    const recentAverage =
      average(recentScores);

    const previousAverage =
      average(previousScores);

    const change =
      recentAverage - previousAverage;

    let momentumLabel =
      "Just getting started";

    if (elapsedDays >= 7 && elapsedDays < 14) {
      momentumLabel = "Pattern forming";
    } else if (hasReliableComparison) {
      if (change >= 10) {
        momentumLabel = "Improving";
      } else if (change <= -10) {
        momentumLabel = "Losing momentum";
      } else {
        momentumLabel = "Steady";
      }
    }

    const completedElapsedDays = dayScores.filter(
      (score) => score === 100
    ).length;

    const partialElapsedDays = dayScores.filter(
      (score) => score > 0 && score < 100
    ).length;

    const untouchedElapsedDays = dayScores.filter(
      (score) => score === 0
    ).length;

    let recoveryLabel =
      "No recovery pattern yet";

    if (elapsedDays > 1) {
      const lastScore =
        dayScores[dayScores.length - 1];
      const previousScore =
        dayScores[dayScores.length - 2];

      if (lastScore > 0 && previousScore === 0) {
        recoveryLabel = "Recovered today";
      } else if (lastScore > previousScore) {
        recoveryLabel = "Building back";
      } else if (lastScore < previousScore) {
        recoveryLabel = "Needs a reset";
      } else if (lastScore > 0) {
        recoveryLabel = "Holding steady";
      }
    }

    let action =
      "Complete one commitment today and start building your baseline.";

    if (elapsedDays >= 30) {
      if (change >= 10) {
        action =
          "Your long-term pattern is improving. Protect the routines that are driving the change.";
      } else if (change <= -10) {
        action =
          "Your recent pattern is slipping. Simplify the routine and rebuild one commitment at a time.";
      } else if (recentAverage >= 80) {
        action =
          "Your consistency is strong. Protect the routines that have become automatic.";
      } else if (recentAverage >= 50) {
        action =
          "Your pattern is established. Focus on turning partial days into complete days.";
      }
    } else if (elapsedDays >= 14) {
      if (change >= 10) {
        action =
          "Your recent pattern is improving. Keep reinforcing the commitments that are working.";
      } else if (change <= -10) {
        action =
          "Your recent pattern is slipping. Lower the friction and rebuild consistency.";
      } else if (recentAverage >= 80) {
        action =
          "Your recent consistency is strong. Focus on protecting the streak.";
      } else if (recentAverage >= 50) {
        action =
          "You have a base to build on. Aim to turn partial days into complete days.";
      }
    } else if (elapsedDays >= 7) {
      if (recentAverage >= 80) {
        action =
          "You're forming a strong pattern. Keep the routine simple and repeatable.";
      } else if (recentAverage >= 50) {
        action =
          "Your pattern is forming. Focus on repeating the commitments you can control most easily.";
      } else {
        action =
          "Your baseline is still forming. Prioritize one or two commitments and build from there.";
      }
    } else if (elapsedDays > 1) {
      action =
        "Keep logging your commitments. The first week is about establishing your baseline.";
    }

    return {
      elapsedDays,
      recentAverage,
      previousAverage,
      change,
      journeyStage,
      signalConfidence,
      hasReliableComparison,
      momentumLabel,
      completedElapsedDays,
      partialElapsedDays,
      untouchedElapsedDays,
      recoveryLabel,
      action,
    };
  }, [
    actualJourneyDay,
    commitments,
    journeyState,
    totalJourneyDays,
  ]);

  const isCurrentDay =
    viewDayNumber ===
    actualJourneyDay;

  if (!journeyConfig.primaryGoal) {
    return (
      <JourneySetup
        onComplete={() =>
          setJourneyConfig(loadJourneyConfig())
        }
      />
    );
  }

  if (showJourneySettings) {
    return (
      <JourneySettings
        onClose={() => setShowJourneySettings(false)}
        onComplete={() => {
          setJourneyConfig(loadJourneyConfig());
          setShowJourneySettings(false);
        }}
      />
    );
  }



  return (
    <>
      {showJourneyCompletion && (
        <div
          className="journey-completion-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="journey-completion-title"
        >
          <div className="journey-completion-card">
            <div className="journey-completion-icon" aria-hidden="true">
              <Check size={24} strokeWidth={1.8} />
            </div>

            <span className="eyebrow">Journey complete</span>

            <h2 id="journey-completion-title">
              You finished the journey.
            </h2>

            <p className="journey-completion-goal">
              {journeyConfig?.primaryGoal || "Your primary goal"}
            </p>

            <div className="journey-completion-summary">
              <div className="journey-completion-stat">
                <strong>{journeyAnalytics.completedDays}</strong>
                <span>Days completed</span>
              </div>

              <div className="journey-completion-stat">
                <strong>{journeyAnalytics.completedPercentage}%</strong>
                <span>Journey completion</span>
              </div>

              <div className="journey-completion-stat">
                <strong>{longestHabitStreak}d</strong>
                <span>Best streak</span>
              </div>

              <div className="journey-completion-stat">
                <strong>{focusMinutes}m</strong>
                <span>Deep work</span>
              </div>
            </div>

            <p className="journey-completion-range">
              {journeyConfig?.startDate} — {journeyConfig?.endDate}
              <span>{totalJourneyDays} days</span>
            </p>

            <button
              type="button"
              className="journey-completion-button"
              onClick={dismissJourneyCompletion}
            >
              Review journey
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}


    {celebrationMilestone && (
    <div className="milestone-celebration-overlay" role="status">
      <div className="milestone-celebration-card">
        <button
          type="button"
          className="milestone-celebration-close"
          onClick={dismissMilestoneCelebration}
          aria-label="Dismiss milestone celebration"
        >
          <X size={16} strokeWidth={1.7} />
        </button>

        <div className="milestone-celebration-icon">
          <PartyPopper size={20} strokeWidth={1.6} />
        </div>

        <span className="eyebrow">Journey milestone</span>
        <h3>{celebrationMilestone.label}</h3>

        <p>
          You reached Day {celebrationMilestone.day}. Keep moving forward.
        </p>

        <button
          type="button"
          className="milestone-celebration-action"
          onClick={dismissMilestoneCelebration}
        >
          Continue journey
        </button>
      </div>
    </div>
  )}

      {dayTransitionNotice && (
        <div
          className="day-transition-notice"
          role="status"
          aria-live="polite"
        >
          <div className="day-transition-copy">
            <span className="eyebrow">New journey day</span>
            <strong>Day {dayTransitionNotice.dayNumber} is here.</strong>
            <span>Your dashboard has moved to today.</span>
          </div>

          <button
            type="button"
            className="day-transition-dismiss"
            onClick={dismissDayTransition}
            aria-label="Dismiss day transition notice"
          >
            Dismiss
          </button>
        </div>
      )}

      {journeyHasBeenCompleted && !showJourneyCompletion && (
        <div className="journey-completion-strip" role="status">
          <div className="journey-completion-strip-copy">
            <span className="eyebrow">Journey complete</span>
            <strong>Your journey is complete.</strong>
            <span>Your history is preserved and ready to review.</span>
          </div>
          <button
            type="button"
            className="journey-completion-strip-button"
            onClick={() => setShowJourneyCompletion(true)}
          >
            Review
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      <PageContainer>

      <section className="dashboard-header">

        <div className="dashboard-heading">

          <span className="eyebrow">
            Your daily plan
          </span>

          <div className="heading-row">

            <h1>
              Stay on Track Today
            </h1>

            <div className="heading-divider" />

            <div className="status-message">

              <div className="status-icon">
                <Sparkles
                  size={18}
                  strokeWidth={1.6}
                />
              </div>

              <div>

                <strong>
                  Let's make today count.
                </strong>

                <span>
                  Your productivity system is ready.
                </span>

              </div>

            </div>

          </div>

        </div>

        <div className="header-actions">

          <button
            type="button"
            className="secondary-button"
            disabled
            title="Widget system coming later"
          >
            <Plus
              size={16}
              strokeWidth={1.8}
            />

            Add Widget
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={() => setShowJourneySettings(true)}
            title="Edit your journey"
          >
            <Settings2
              size={16}
              strokeWidth={1.8}
            />
            Edit Journey
          </button>

        </div>

      </section>

      <GlassCard className="daily-strip">

        <div className="daily-date">

          <strong>
            {viewDate.day}
          </strong>

          <span>
            {viewDate.month}
          </span>

        </div>

        <div className="daily-info">

          <span className="eyebrow">
            Your {totalJourneyDays}-day journey
          </span>

          <strong>
            Day {viewDayNumber} of{" "}
            {totalJourneyDays}
          </strong>

        </div>

        <div className="daily-message">

          <span>
            {isCurrentDay
              ? "Start strong."
              : "Journey day selected."}
          </span>

          <span>
            Consistency is the goal.
          </span>

        </div>

        <div className="day-navigation">

          <button
            type="button"
            className="round-arrow"
            disabled={
              viewDayNumber === 1
            }
            onClick={
              goToPreviousDay
            }
            aria-label="Previous day"
            title="Previous day"
          >
            <ArrowLeft size={15} />
          </button>

          <button
            type="button"
            className="round-arrow"
            disabled={
              viewDayNumber ===
              totalJourneyDays
            }
            onClick={
              goToNextDay
            }
            aria-label="Next day"
            title="Next day"
          >
            <ArrowRight size={15} />
          </button>

        </div>

      </GlassCard>

      <JourneyHeatmap />

      <DailyHabits
        selectedDay={
          viewDayNumber
        }
      />

      <WaterTracker
        selectedDay={
          viewDayNumber
        }
      />

      <TomorrowPlan
        selectedDay={
          viewDayNumber
        }
      />

      <FocusTimer />

      {/* =========================================
          DASHBOARD WIDGETS
      ========================================= */}

      <section className="widget-grid">

        <GlassCard className="widget-card goals-widget">

          <div className="widget-header">

            <span className="eyebrow">
              Daily Goals
            </span>

            <div className="widget-icon">
              <Target
                size={17}
                strokeWidth={1.6}
              />
            </div>

          </div>

          <div className="widget-number">

            {completedCount}

            <span>
              /{commitments.length}
            </span>

          </div>

          <div className="widget-progress">

            <div
              className="widget-progress-fill"
              style={{
                width: `${completionPercentage}%`,
              }}
            />

          </div>

          <p>
            Commitments completed{" "}
            {isCurrentDay
              ? "today"
              : `on Day ${viewDayNumber}`}
          </p>

        </GlassCard>

        <GlassCard className="widget-card focus-widget">

          <div className="widget-header">

            <span className="eyebrow">
              Deep Work Time
            </span>

            <div className="widget-icon">
              <Clock3
                size={17}
                strokeWidth={1.6}
              />
            </div>

          </div>

          <div className="widget-number">

            {focusMinutes}

            <span>
              m
            </span>

          </div>

          <div
            className="widget-meta"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              flexWrap: "wrap",
              gap: "16px",
              marginTop: 0,
            }}
          >

            <span>
              {isCurrentDay
                ? "Today's focus"
                : `Day ${viewDayNumber} focus`}
            </span>

            <span>
              {focusSessionCount}{" "}
              {focusSessionCount === 1
                ? "session"
                : "sessions"}
            </span>

          </div>

          <p>
            Focused time{" "}
            {isCurrentDay
              ? "today"
              : `on Day ${viewDayNumber}`}
          </p>

        </GlassCard>

        <GlassCard className="widget-card score-widget">

          <div className="widget-header">

            <span className="eyebrow">
              Day Score
            </span>

            <div className="score-badge">
              Current Score:{" "}
              {dayScore}
            </div>

          </div>

          <div className="score-visual">

            <div
              className="score-ring"
              style={{
                background: `conic-gradient(
                  rgba(53, 199, 89, 0.95) ${
                    dayScore * 3.6
                  }deg,
                  rgba(255, 255, 255, 0.06) 0deg
                )`,
              }}
            >

              <div>

                <strong>
                  {dayScore}
                </strong>

                <span>
                  /100
                </span>

              </div>

            </div>

            <div className="score-description">

              <span>
                Productivity
              </span>

              <strong>
                {getScoreMessage()}
              </strong>

            </div>

          </div>

        </GlassCard>

      </section>

      <div
        style={{
          marginTop: "14px",
        }}
      >

        <GlassCard className="overview-card">

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >

            <div style={{ minWidth: 0, flex: 1 }}>

              <span className="eyebrow">
                Journey Progress
            </span>

            <strong
              style={{
                display: "block",
                marginTop: "6px",
                fontSize: "28px",
                lineHeight: 1.1,
              }}
            >
              {journeyProgress.percentage}%
            </strong>

            <span
              style={{
                display: "block",
                marginTop: "7px",
              }}
            >
              {journeyProgress.isBeforeJourney
                ? `Starts ${journeyConfig.startDate}`
                : journeyProgress.isComplete
                  ? "Journey complete"
                  : `${journeyProgress.elapsedDays} days elapsed · ${journeyProgress.remainingDays} remaining`}
            </span>

          </div>

          <div
            className="widget-meta"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              whiteSpace: "nowrap",
            }}
          >
            <CalendarDays size={16} strokeWidth={1.6} />
            <span>{getJourneyDuration(journeyConfig)} days</span>
          </div>

        </div>

        <div
          style={{
            height: "7px",
            marginTop: "18px",
            overflow: "hidden",
            borderRadius: "999px",
            background: "rgba(255,255,255,.055)",
          }}
        >
          <div
            style={{
              width: `${journeyProgress.percentage}%`,
              height: "100%",
              borderRadius: "inherit",
              background:
                "linear-gradient(90deg, rgba(255,255,255,.42), rgba(255,255,255,.82))",
              transition: "width .45s ease",
            }}
          />
          </div>

        </GlassCard>

      </div>

      <div
        style={{
          marginTop: "14px",
        }}
      >

        <GlassCard className="overview-card">

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              marginBottom: "16px",
              flexWrap: "wrap",
            }}
          >

            <div>

              <span className="eyebrow">
                Journey Milestones
              </span>

              <h2
                style={{
                  margin: "5px 0 0",
                }}
              >
                Mark the distance.
              </h2>

            </div>

            <span className="widget-meta">
              {journeyMilestones.filter(
                (milestone) => milestone.reached
              ).length}{" "}
              / {journeyMilestones.length} reached
            </span>

          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(125px, 1fr))",
              gap: "10px",
            }}
          >

            {journeyMilestones.map((milestone) => (

              <div
                key={`${milestone.day}-${milestone.label}`}
                style={{
                  minHeight: "92px",
                  padding: "14px",
                  borderRadius: "12px",
                  border: milestone.current
                    ? "1px solid rgba(126, 244, 158, .28)"
                    : "1px solid rgba(255,255,255,.06)",
                  background: milestone.reached
                    ? "rgba(126,244,158,.055)"
                    : "rgba(255,255,255,.018)",
                  boxShadow: milestone.current
                    ? "0 0 0 1px rgba(126,244,158,.04), inset 0 1px 0 rgba(255,255,255,.025)"
                    : "inset 0 1px 0 rgba(255,255,255,.018)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >

                  <span
                    className="eyebrow"
                    style={{
                      fontSize: "10px",
                    }}
                  >
                    Day {milestone.day}
                  </span>

                  {milestone.reached && (
                    <Check
                      size={14}
                      strokeWidth={1.8}
                    />
                  )}

                </div>

                <strong
                  style={{
                    fontSize: "13px",
                    lineHeight: 1.3,
                    color: milestone.reached
                      ? "rgba(126,244,158,.95)"
                      : "rgba(255,255,255,.78)",
                  }}
                >
                  {milestone.label}
                </strong>

                <span
                  style={{
                    fontSize: "11px",
                    color: "rgba(255,255,255,.38)",
                  }}
                >
                  {milestone.current
                    ? "Current milestone"
                    : milestone.reached
                      ? "Reached"
                      : `${milestone.day - journeyProgress.elapsedDays} days away`}
                </span>

              </div>

            ))}

          </div>

        </GlassCard>

      </div>

      {/* =========================================
          PHASE 7D JOURNEY INTELLIGENCE
      ========================================= */}

      <GlassCard className="consistency-summary">

        <div className="section-heading">

          <div>

            <span className="eyebrow">
              Journey Intelligence
            </span>

            <h2>
              Read your momentum.
            </h2>

          </div>

          <div
            className="widget-meta"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "18px",
              flexWrap: "wrap",
            }}
          >

            <span>
              {overallConsistency}% consistency
            </span>

            <span>
              {longestHabitStreak} day best streak
            </span>

          </div>

        </div>

        <div className="consistency-summary-grid">

          <div className="consistency-overview">

            <span className="eyebrow">
              Current streak
            </span>

            <strong>
              {strongestConsistencyHabit
                ? strongestConsistencyHabit.currentStreak
                : 0}
              {" days"}
            </strong>

            <span>
              Strongest commitment streak
            </span>

          </div>

          <div className="consistency-overview">

            <span className="eyebrow">
              What's working
            </span>

            <strong>
              {strongestHabit
                ? strongestHabit.label
                : "—"}
            </strong>

            <span>
              {strongestHabit
                ? `${strongestHabit.percentage}% completion`
                : "No data yet"}
            </span>

          </div>

          <div className="consistency-overview">

            <span className="eyebrow">
              Needs attention
            </span>

            <strong>
              {weakestHabit
                ? weakestHabit.label
                : "—"}
            </strong>

            <span>
              {weakestHabit
                ? `${weakestHabit.percentage}% completion`
                : "No data yet"}
            </span>

          </div>

        </div>

        <div className="journey-analytics-overview intelligence-pattern-grid">

          <div className="journey-analytics-stat">

            <span className="eyebrow">
              Completed days
            </span>

            <strong>
              {journeyAnalytics.completedDays}
            </strong>

            <span>
              Every commitment completed
            </span>

          </div>

          <div className="journey-analytics-stat">

            <span className="eyebrow">
              Partial days
            </span>

            <strong>
              {journeyAnalytics.partialDays}
            </strong>

            <span>
              Some commitments completed
            </span>

          </div>

          <div className="journey-analytics-stat">

            <span className="eyebrow">
              Untouched days
            </span>

            <strong>
              {journeyAnalytics.untouchedDays}
            </strong>

            <span>
              No commitments completed
            </span>

          </div>

        </div>

        <div className="journey-analytics-periods">

          <div>

            <span className="eyebrow">
              Best period
            </span>

            <strong>
              {journeyAnalytics.strongestWeek
                ? `Week ${journeyAnalytics.strongestWeek.week}`
                : "—"}
            </strong>

            <span>
              {journeyAnalytics.strongestWeek
                ? `${journeyAnalytics.strongestWeek.averageCompletion}% average completion`
                : "No weekly data yet"}
            </span>

          </div>

          <div>

            <span className="eyebrow">
              Needs work
            </span>

            <strong>
              {journeyAnalytics.weakestWeek
                ? `Week ${journeyAnalytics.weakestWeek.week}`
                : "—"}
            </strong>

            <span>
              {journeyAnalytics.weakestWeek
                ? `${journeyAnalytics.weakestWeek.averageCompletion}% average completion`
                : "No weekly data yet"}
            </span>

          </div>

        </div>

        <div className="consistency-summary-grid">

          <div className="consistency-overview">

            <span className="eyebrow">
              Momentum
            </span>

            <strong>
              {behaviorIntelligence.momentumLabel}
            </strong>

            <span>
              {behaviorIntelligence.hasReliableComparison
                ? `${behaviorIntelligence.change >= 0 ? "+" : ""}${behaviorIntelligence.change} pts vs prior 7 days`
                : `${behaviorIntelligence.recentAverage}% recent`}
            </span>

          </div>

          <div className="consistency-overview">

            <span className="eyebrow">
              Recovery signal
            </span>

            <strong>
              {behaviorIntelligence.recoveryLabel}
            </strong>

            <span>
              {behaviorIntelligence.completedElapsedDays} complete · {behaviorIntelligence.partialElapsedDays} partial · {behaviorIntelligence.untouchedElapsedDays} no progress
            </span>

          </div>

          <div className="consistency-overview">

            <span className="eyebrow">
              Next move
            </span>

            <strong>
              {behaviorIntelligence.action}
            </strong>

            <span>
              {behaviorIntelligence.journeyStage}
            </span>

          </div>

        </div>

        <div className="consistency-summary-grid">

          <div
            className="consistency-overview"
            style={{
              gridColumn: "1 / -1",
            }}
          >

            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "20px",
                flexWrap: "wrap",
              }}
            >

              <div
                style={{
                  minWidth: 0,
                  flex: 1,
                }}
              >

                <span className="eyebrow">
                  Personal Coach
                </span>

                <strong
                  style={{
                    display: "block",
                    marginTop: "6px",
                    lineHeight: 1.2,
                  }}
                >
                  {coachGuidance.priority}
                </strong>

                <span
                  style={{
                    display: "block",
                    marginTop: "8px",
                    lineHeight: 1.45,
                    maxWidth: "760px",
                  }}
                >
                  {coachGuidance.reason}
                </span>

              </div>

              <div
                className="widget-meta"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  whiteSpace: "nowrap",
                }}
              >

                <Sparkles
                  size={16}
                  strokeWidth={1.6}
                />

                <span>
                  Day {viewDayNumber} focus
                </span>

              </div>

            </div>

            <span
              style={{
                marginTop: "12px",
                display: "block",
                maxWidth: "900px",
              }}
            >
              {coachGuidance.note}
            </span>

          </div>

        </div>

      </GlassCard>

      {/* =========================================
          PHASE 5C PERFORMANCE DATA
      ========================================= */}

      <GlassCard className="performance-summary">

        <div className="section-heading">

          <div>

            <span className="eyebrow">
              Performance Intelligence
            </span>

            <h2>
              Know what is working.
            </h2>

          </div>

          <div className="widget-meta">

            <span>
              {completedDailyHabits}/
              {commitments.length} completed
            </span>

            <span>
              {pendingDailyHabits} pending
            </span>

          </div>

        </div>

        <div className="performance-summary-grid">

          <div>
            <span className="eyebrow">
              Strongest habit
            </span>

            <strong>
              {strongestHabit
                ? strongestHabit.label
                : "—"}
            </strong>

            <span>
              {strongestHabit
                ? `${strongestHabit.completedDays} of ${totalJourneyDays} days`
                : "No data yet"}
            </span>
          </div>

          <div>
            <span className="eyebrow">
              Needs attention
            </span>

            <strong>
              {weakestHabit
                ? weakestHabit.label
                : "—"}
            </strong>

            <span>
              {weakestHabit
                ? `${weakestHabit.completedDays} of ${totalJourneyDays} days`
                : "No data yet"}
            </span>
          </div>

          <div>
            <span className="eyebrow">
              Selected day
            </span>

            <strong>
              {completionPercentage}%
            </strong>

            <span>
              {missedDailyHabits} missed ·{" "}
              {pendingDailyHabits} pending
            </span>
          </div>

        </div>

      </GlassCard>

      {/* =========================================
          PHASE 5D CONSISTENCY INTELLIGENCE
      ========================================= */}

      <GlassCard className="consistency-summary">

        <div className="section-heading">

          <div>

            <span className="eyebrow">
              Consistency Intelligence
            </span>

            <h2>
              Build what you repeat.
            </h2>

          </div>

          <div className="widget-meta">

            <span>
              {overallConsistency}% overall consistency
            </span>

            <span>
              {longestHabitStreak} day best streak
            </span>

          </div>

        </div>

        <div className="consistency-summary-grid">

          <div className="consistency-overview">

            <span className="eyebrow">
              Overall consistency
            </span>

            <strong>
              {overallConsistency}%
            </strong>

            <span>
              Completed commitments across the journey
            </span>

          </div>

          <div className="consistency-overview">

            <span className="eyebrow">
              Strongest streak
            </span>

            <strong>
              {strongestConsistencyHabit
                ? strongestConsistencyHabit.label
                : "—"}
            </strong>

            <span>
              {strongestConsistencyHabit
                ? `${strongestConsistencyHabit.currentStreak} day current streak`
                : "No streak data yet"}
            </span>

          </div>

          <div className="consistency-overview">

            <span className="eyebrow">
              Best streak
            </span>

            <strong>
              {longestHabitStreak} days
            </strong>

            <span>
              Longest single-habit streak
            </span>

          </div>

        </div>

        <div className="consistency-habit-list">

          {habitConsistency.map((habit) => (

            <div
              key={habit.id}
              className="consistency-habit-row"
            >

              <div className="consistency-habit-name">

                <strong>
                  {habit.label}
                </strong>

                <span>
                  {habit.percentage}% consistency
                </span>

              </div>

              <div className="consistency-habit-streaks">

                <span>
                  Current {habit.currentStreak}d
                </span>

                <span>
                  Best {habit.bestStreak}d
                </span>

              </div>

            </div>

          ))}

        </div>

      </GlassCard>

      {/* =========================================
          PHASE 5E JOURNEY ANALYTICS
      ========================================= */}

      <GlassCard className="journey-analytics">

        <div className="section-heading">

          <div>

            <span className="eyebrow">
              Journey Analytics
            </span>

            <h2>
              See the bigger picture.
            </h2>

          </div>

          <div className="widget-meta">

            <span>
              {journeyAnalytics.completedDays}/{totalJourneyDays} complete
            </span>

            <span>
              {journeyAnalytics.completedPercentage}% journey completion
            </span>

          </div>

        </div>

        <div className="journey-analytics-overview">

          <div className="journey-analytics-stat">

            <span className="eyebrow">
              Completed days
            </span>

            <strong>
              {journeyAnalytics.completedDays}
            </strong>

            <span>
              All commitments completed
            </span>

          </div>

          <div className="journey-analytics-stat">

            <span className="eyebrow">
              Partial days
            </span>

            <strong>
              {journeyAnalytics.partialDays}
            </strong>

            <span>
              At least one commitment completed
            </span>

          </div>

          <div className="journey-analytics-stat">

            <span className="eyebrow">
              Untouched days
            </span>

            <strong>
              {journeyAnalytics.untouchedDays}
            </strong>

            <span>
              No commitments completed
            </span>

          </div>

        </div>

        <div className="journey-analytics-trend">

          <div className="journey-analytics-trend-header">

            <span className="eyebrow">
              Weekly consistency
            </span>

            <span>
              {journeyAnalytics.weeklyTrend.length} weeks
            </span>

          </div>

          <div className="journey-analytics-weeks">

            {journeyAnalytics.weeklyTrend.map((week) => (

              <div
                key={week.week}
                className="journey-analytics-week"
                title={`Week ${week.week}: ${week.averageCompletion}% average completion`}
              >

                <div className="journey-analytics-week-bar">

                  <span
                    style={{
                      height: `${week.averageCompletion}%`,
                    }}
                  />

                </div>

                <strong>
                  W{week.week}
                </strong>

                <span>
                  {week.averageCompletion}%
                </span>

              </div>

            ))}

          </div>

        </div>

        <div className="journey-analytics-periods">

          <div>

            <span className="eyebrow">
              Strongest period
            </span>

            <strong>
              Week {journeyAnalytics.strongestWeek.week}
            </strong>

            <span>
              Days {journeyAnalytics.strongestWeek.startDay}–{journeyAnalytics.strongestWeek.endDay}
              {" · "}
              {journeyAnalytics.strongestWeek.averageCompletion}% average
            </span>

          </div>

          <div>

            <span className="eyebrow">
              Needs work
            </span>

            <strong>
              Week {journeyAnalytics.weakestWeek.week}
            </strong>

            <span>
              Days {journeyAnalytics.weakestWeek.startDay}–{journeyAnalytics.weakestWeek.endDay}
              {" · "}
              {journeyAnalytics.weakestWeek.averageCompletion}% average
            </span>

          </div>

        </div>

      </GlassCard>

      {/* =========================================
          DAILY TIMELINE
          Functional event planner
      ========================================= */}

      <GlassCard className="timeline-card">
        <DailyTimeline
          selectedDay={viewDayNumber}
          isCurrentDay={isCurrentDay}
        />
      </GlassCard>

    </PageContainer>
    </>
  );
}

export default Overview;