import { useEffect, useRef, useState } from "react";
import {
  Check,
  Clock3,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";

const DEFAULT_HOURS = 1;
const DEFAULT_MINUTES = 0;

const ZEN_COLORS = [
  "blue",
  "purple",
  "green",
  "pink",
];

const FOCUS_STORAGE_KEY =
  "productivity-116-focus-v1";

function formatTime(totalSeconds) {
  const hours = Math.floor(
    totalSeconds / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const seconds =
    totalSeconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":");
}

function getRandomColor() {
  const randomIndex = Math.floor(
    Math.random() * ZEN_COLORS.length
  );

  return ZEN_COLORS[randomIndex];
}

function getJourneyDay() {
  const startDate = new Date(
    2026,
    8,
    7
  );

  const endDate = new Date(
    2026,
    11,
    31
  );

  const today = new Date();

  const currentDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const startDateOnly = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );

  const endDateOnly = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate()
  );

  if (
    currentDate < startDateOnly ||
    currentDate > endDateOnly
  ) {
    return null;
  }

  return (
    Math.floor(
      (currentDate - startDateOnly) /
        (1000 * 60 * 60 * 24)
    ) + 1
  );
}

function saveCompletedSession(session) {
  try {
    const existingSessions =
      JSON.parse(
        localStorage.getItem(
          FOCUS_STORAGE_KEY
        ) || "[]"
      );

    const updatedSessions = [
      ...existingSessions,
      session,
    ];

    localStorage.setItem(
      FOCUS_STORAGE_KEY,
      JSON.stringify(
        updatedSessions
      )
    );

    window.dispatchEvent(
      new Event(
        "focus-session-updated"
      )
    );
  } catch (storageError) {
    console.error(
      "Unable to save focus session:",
      storageError
    );
  }
}

function FocusTimer() {
  const [modeName, setModeName] =
    useState("");

  const [hours, setHours] =
    useState(DEFAULT_HOURS);

  const [minutes, setMinutes] =
    useState(DEFAULT_MINUTES);

  const [remainingSeconds, setRemainingSeconds] =
    useState(0);

  const [isRunning, setIsRunning] =
    useState(false);

  const [isStarted, setIsStarted] =
    useState(false);

  const [error, setError] =
    useState("");

  const [ambientColor, setAmbientColor] =
    useState("blue");

  const [sessionSaved, setSessionSaved] =
    useState(false);

  /*
   * This ref prevents the same completed
   * timer from ever being saved twice.
   */
  const completionHandledRef =
    useRef(false);

  /*
   * TIMER
   *
   * This effect ONLY counts down.
   * It does not save anything.
   */
  useEffect(() => {
    if (!isRunning) {
      return undefined;
    }

    const timer = setInterval(() => {
      setRemainingSeconds(
        (previous) =>
          Math.max(previous - 1, 0)
      );
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isRunning]);

  /*
   * COMPLETION
   *
   * Once the timer reaches zero, save the
   * session exactly once.
   */
  useEffect(() => {
    if (
      !isStarted ||
      remainingSeconds !== 0 ||
      completionHandledRef.current
    ) {
      return;
    }

    completionHandledRef.current = true;

    setIsRunning(false);

    const journeyDay =
      getJourneyDay();

    const totalDurationMinutes =
      Number(hours) * 60 +
      Number(minutes);

    saveCompletedSession({
      id: `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`,

      modeName:
        modeName.trim(),

      durationMinutes:
        totalDurationMinutes,

      durationSeconds:
        totalDurationMinutes * 60,

      journeyDay,

      completedAt:
        new Date().toISOString(),
    });

    setSessionSaved(true);
  }, [
    isStarted,
    remainingSeconds,
    hours,
    minutes,
    modeName,
  ]);

  function startTimer() {
    const trimmedName =
      modeName.trim();

    const safeHours =
      Math.max(
        0,
        Math.min(
          99,
          Number(hours) || 0
        )
      );

    const safeMinutes =
      Math.max(
        0,
        Math.min(
          59,
          Number(minutes) || 0
        )
      );

    const totalSeconds =
      safeHours * 60 * 60 +
      safeMinutes * 60;

    if (!trimmedName) {
      setError(
        "Give this focus session a name."
      );

      return;
    }

    if (totalSeconds <= 0) {
      setError(
        "Set a focus duration greater than zero."
      );

      return;
    }

    setError("");

    setModeName(trimmedName);

    setHours(safeHours);

    setMinutes(safeMinutes);

    setRemainingSeconds(
      totalSeconds
    );

    setAmbientColor(
      getRandomColor()
    );

    /*
     * New timer session means the completion
     * guard must be reset.
     */
    completionHandledRef.current = false;

    setSessionSaved(false);

    setIsStarted(true);

    setIsRunning(true);
  }

  function toggleTimer() {
    if (remainingSeconds <= 0) {
      return;
    }

    setIsRunning(
      (previous) => !previous
    );
  }

  function resetTimer() {
    setIsRunning(false);

    setIsStarted(false);

    setRemainingSeconds(0);

    setSessionSaved(false);

    setError("");

    completionHandledRef.current = false;
  }

  if (isStarted) {
    return (
      <section
        className={`focus-timer focus-timer-active ambient-${ambientColor}`}
      >
        <div
          className="focus-ambient-orb focus-ambient-orb-one"
          aria-hidden="true"
        />

        <div
          className="focus-ambient-orb focus-ambient-orb-two"
          aria-hidden="true"
        />

        <div
          className="focus-ambient-orb focus-ambient-orb-three"
          aria-hidden="true"
        />

        <div
          className="focus-glass-layer"
          aria-hidden="true"
        />

        <div
          className="focus-mode-background"
          aria-hidden="true"
        >
          {modeName.toUpperCase()}
        </div>

        {remainingSeconds === 0 && (
          <div className="focus-celebration">
            <div className="focus-celebration-burst">
              <span />
              <span />
              <span />
              <span />
            </div>

            <div className="focus-celebration-ring focus-ring-one" />
            <div className="focus-celebration-ring focus-ring-two" />
            <div className="focus-celebration-ring focus-ring-three" />

            <div className="focus-celebration-icon">
              <Check
                size={28}
                strokeWidth={2}
              />
            </div>

            <div className="focus-celebration-text">
              <strong>
                SESSION COMPLETE
              </strong>

              <span>
                Deep work accomplished.
              </span>
            </div>

            <div
              className="focus-particle focus-particle-one"
              aria-hidden="true"
            />

            <div
              className="focus-particle focus-particle-two"
              aria-hidden="true"
            />

            <div
              className="focus-particle focus-particle-three"
              aria-hidden="true"
            />

            <div
              className="focus-particle focus-particle-four"
              aria-hidden="true"
            />

            <div
              className="focus-particle focus-particle-five"
              aria-hidden="true"
            />

            <div
              className="focus-particle focus-particle-six"
              aria-hidden="true"
            />

            <div
              className="focus-particle focus-particle-seven"
              aria-hidden="true"
            />

            <div
              className="focus-particle focus-particle-eight"
              aria-hidden="true"
            />
          </div>
        )}

        <div className="focus-timer-header">
          <div className="focus-title-group">
            <div className="focus-icon">
              <Clock3
                size={17}
                strokeWidth={1.7}
              />
            </div>

            <div>
              <span className="eyebrow">
                Deep Work
              </span>

              <h3>
                {modeName}
              </h3>
            </div>
          </div>

          <span
            className={`focus-status ${
              isRunning
                ? "running"
                : remainingSeconds === 0
                ? "completed"
                : "paused"
            }`}
          >
            {isRunning
              ? "In progress"
              : remainingSeconds === 0
              ? "Completed"
              : "Paused"}
          </span>
        </div>

        <div className="focus-timer-display">
          <span>
            {formatTime(
              remainingSeconds
            )}
          </span>

          <small>
            {isRunning
              ? "Stay focused."
              : remainingSeconds === 0
              ? "Session complete."
              : "Timer paused."}
          </small>
        </div>

        <div className="focus-timer-actions">
          {remainingSeconds > 0 && (
            <button
              type="button"
              className="primary-button"
              onClick={toggleTimer}
            >
              {isRunning ? (
                <>
                  <Pause
                    size={15}
                    strokeWidth={1.8}
                  />
                  Pause
                </>
              ) : (
                <>
                  <Play
                    size={15}
                    strokeWidth={1.8}
                  />
                  Resume
                </>
              )}
            </button>
          )}

          <button
            type="button"
            className="secondary-button"
            onClick={resetTimer}
          >
            <RotateCcw
              size={15}
              strokeWidth={1.8}
            />
            Reset
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="focus-timer">
      <div className="focus-timer-header">
        <div className="focus-title-group">
          <div className="focus-icon">
            <Clock3
              size={17}
              strokeWidth={1.7}
            />
          </div>

          <div>
            <span className="eyebrow">
              Deep Work
            </span>

            <h3>
              Create a focus session
            </h3>
          </div>
        </div>
      </div>

      <div className="focus-form">
        <div className="focus-field">
          <label htmlFor="focus-mode-name">
            Mode name
          </label>

          <input
            id="focus-mode-name"
            type="text"
            value={modeName}
            onChange={(event) =>
              setModeName(
                event.target.value
              )
            }
            placeholder="e.g. Coding"
            maxLength={50}
          />
        </div>

        <div className="focus-duration">
          <div className="focus-field">
            <label htmlFor="focus-hours">
              Hours
            </label>

            <input
              id="focus-hours"
              type="number"
              min="0"
              max="99"
              value={hours}
              onChange={(event) =>
                setHours(
                  event.target.value
                )
              }
            />
          </div>

          <div className="focus-field">
            <label htmlFor="focus-minutes">
              Minutes
            </label>

            <input
              id="focus-minutes"
              type="number"
              min="0"
              max="59"
              value={minutes}
              onChange={(event) =>
                setMinutes(
                  event.target.value
                )
              }
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="focus-error">
          {error}
        </p>
      )}

      <button
        type="button"
        className="primary-button focus-start-button"
        onClick={startTimer}
      >
        <Play
          size={15}
          strokeWidth={1.8}
        />

        Start Focus
      </button>
    </section>
  );
}

export default FocusTimer;