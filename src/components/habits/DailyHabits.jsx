import { useEffect, useState } from "react";
import { Check, Circle } from "lucide-react";
import {
  getDayCompletion,
  getJourneyCommitments,
  loadJourneyConfig,
  migrateStoredJourneyState,
  normalizeJourneyStateForConfig,
} from "../heatmap/heatmapUtils";

const STORAGE_KEY =
  "productivity-116-habits-v3";

const BACKUP_STORAGE_KEY =
  "productivity-116-habits-backup-v1";

function createBlankCommitmentState(
  commitments
) {
  return commitments.reduce(
    (state, commitment) => {
      state[commitment.id] = null;
      return state;
    },
    {}
  );
}

function normalizeCommitmentDayState(
  dayState,
  commitments
) {
  const normalized =
    createBlankCommitmentState(
      commitments
    );

  if (
    !dayState ||
    typeof dayState !== "object" ||
    Array.isArray(dayState)
  ) {
    return normalized;
  }

  commitments.forEach((commitment) => {
    const status =
      dayState[commitment.id];

    if (
      status === true ||
      status === false ||
      status === null
    ) {
      normalized[commitment.id] =
        status;
    }
  });

  return normalized;
}

function isValidDayKey(key) {
  const dayNumber = Number(key);

  return (
    Number.isInteger(dayNumber) &&
    dayNumber >= 1
  );
}

function statesAreEqual(first, second) {
  try {
    return JSON.stringify(first) === JSON.stringify(second);
  } catch {
    return false;
  }
}

function normalizeJourneyState(
  journeyState,
  commitments,
  journeyConfig = null
) {
  return normalizeJourneyStateForConfig(
    journeyState,
    journeyConfig || { commitments }
  );
}

function parseAndNormalizeJourneyState(
  serialized,
  commitments,
  journeyConfig = null
) {
  if (!serialized) {
    return null;
  }

  try {
    const parsed = JSON.parse(serialized);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return null;
    }

    return normalizeJourneyState(
      parsed,
      commitments,
      journeyConfig
    );
  } catch {
    return null;
  }
}

function loadCommitmentState(
  commitments = [],
  journeyConfig = null
) {
  try {
    const saved =
      localStorage.getItem(
        STORAGE_KEY
      );

    const migratedSaved =
      migrateStoredJourneyState(
        saved,
        journeyConfig
      );

    const normalizedSaved =
      migratedSaved
        ? normalizeJourneyState(
            migratedSaved,
            commitments,
            journeyConfig
          )
        : parseAndNormalizeJourneyState(
            saved,
            commitments,
            journeyConfig
          );

    if (normalizedSaved) {
      let parsedSaved = null;

      try {
        parsedSaved = JSON.parse(saved);
      } catch {
        parsedSaved = null;
      }

      if (
        !statesAreEqual(
          parsedSaved,
          normalizedSaved
        )
      ) {
        try {
          if (saved) {
            localStorage.setItem(
              BACKUP_STORAGE_KEY,
              saved
            );
          }

          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(
              normalizedSaved
            )
          );
        } catch {
          // Ignore integrity-repair storage errors.
        }
      }

      return normalizedSaved;
    }

    const backup =
      localStorage.getItem(
        BACKUP_STORAGE_KEY
      );

    const normalizedBackup =
      parseAndNormalizeJourneyState(
        backup,
        commitments,
        journeyConfig
      );

    if (normalizedBackup) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(
            normalizedBackup
          )
        );
      } catch {
        // Ignore recovery storage errors.
      }

      return normalizedBackup;
    }

    return {};
  } catch {
    return {};
  }
}

function saveCommitmentState(
  journeyState,
  previousJourneyState
) {
  try {
    const serialized =
      JSON.stringify(
        journeyState
      );

    if (!serialized) {
      return false;
    }

    const existingSaved =
      localStorage.getItem(
        STORAGE_KEY
      );

    const backupValue =
      existingSaved ||
      JSON.stringify(
        previousJourneyState || {}
      );

    if (backupValue) {
      localStorage.setItem(
        BACKUP_STORAGE_KEY,
        backupValue
      );
    }

    localStorage.setItem(
      STORAGE_KEY,
      serialized
    );

    return true;
  } catch {
    return false;
  }
}

function DailyHabits({
  selectedDay,
}) {
  const [journeyConfig, setJourneyConfig] =
    useState(loadJourneyConfig);

  const initialCommitments =
    getJourneyCommitments(
      journeyConfig
    );

  const [journeyState, setJourneyState] =
    useState(() =>
      loadCommitmentState(
        initialCommitments,
        journeyConfig
      )
    );

  const dayNumber =
    selectedDay || 1;

  const commitments =
    getJourneyCommitments(
      journeyConfig
    );

  const storedDay =
    journeyState[dayNumber];

  const currentDay =
    normalizeCommitmentDayState(
      storedDay,
      commitments
    );

  const completedCount =
    getDayCompletion(
      currentDay,
      commitments
    );

  useEffect(() => {
    function handleJourneyConfigUpdate() {
      const nextConfig =
        loadJourneyConfig();

      setJourneyConfig(
        nextConfig
      );

      const nextCommitments =
        getJourneyCommitments(
          nextConfig
        );

      setJourneyState(
        (previous) =>
          normalizeJourneyState(
            previous,
            nextCommitments,
            nextConfig
          )
      );
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
    function handleCommitmentStateUpdate() {
      setJourneyState(
        loadCommitmentState(
          commitments,
          journeyConfig
        )
      );
    }

    window.addEventListener(
      "habit-state-updated",
      handleCommitmentStateUpdate
    );

    return () => {
      window.removeEventListener(
        "habit-state-updated",
        handleCommitmentStateUpdate
      );
    };
  }, [commitments]);

  function setCommitmentStatus(
    commitmentId,
    status
  ) {
    const validCommitment =
      commitments.some(
        (commitment) =>
          commitment.id ===
          commitmentId
      );

    if (!validCommitment) {
      return;
    }

    setJourneyState((previous) => {
      const normalizedPrevious =
        normalizeJourneyState(
          previous,
          commitments,
          journeyConfig
        );

      const previousDay =
        normalizeCommitmentDayState(
          normalizedPrevious[
            dayNumber
          ],
          commitments
        );

      const updatedState = {
        ...normalizedPrevious,
        [dayNumber]: {
          ...previousDay,
          [commitmentId]:
            status,
        },
      };

      const cleanedState =
        normalizeJourneyState(
          updatedState,
          commitments,
          journeyConfig
        );

      const saved =
        saveCommitmentState(
          cleanedState,
          normalizedPrevious
        );

      if (saved) {
        window.dispatchEvent(
          new Event(
            "habit-state-updated"
          )
        );
      }

      return saved
        ? cleanedState
        : previous;
    });
  }

  function cycleCommitment(
    commitmentId
  ) {
    const currentStatus =
      currentDay[commitmentId];

    if (currentStatus === null) {
      setCommitmentStatus(
        commitmentId,
        true
      );
      return;
    }

    if (currentStatus === true) {
      setCommitmentStatus(
        commitmentId,
        false
      );
      return;
    }

    setCommitmentStatus(
      commitmentId,
      null
    );
  }

  return (
    <section className="daily-habits">
      <div className="daily-habits-header">
        <div>
          <span className="eyebrow">
            Day {dayNumber}'s commitments
          </span>

          <h2>
            Stay consistent.
          </h2>

          <p>
            Small actions. One stronger journey.
          </p>
        </div>

        <div className="daily-habits-progress">
          <strong>
            {completedCount}/
            {commitments.length}
          </strong>

          <span>
            completed
          </span>
        </div>
      </div>

      <div className="daily-habits-grid">
        {commitments.map(
          (commitment) => {
            const status =
              currentDay[
                commitment.id
              ];

            const completed =
              status === true;

            const notCompleted =
              status === false;

            return (
              <button
                type="button"
                key={
                  commitment.id
                }
                className={`habit-card ${
                  completed
                    ? "completed"
                    : ""
                } ${
                  notCompleted
                    ? "not-completed"
                    : ""
                }`}
                aria-pressed={
                  completed
                }
                onClick={() =>
                  cycleCommitment(
                    commitment.id
                  )
                }
                style={
                  completed
                    ? {
                        borderColor: "rgba(74, 222, 128, 0.38)",
                        background: "linear-gradient(145deg, rgba(74, 222, 128, 0.10), rgba(255, 255, 255, 0.012))",
                      }
                    : undefined
                }
              >
                <div className="habit-card-top">
                  <span
                    className="habit-card-icon"
                    style={
                      completed
                        ? {
                            color: "#4ade80",
                            borderColor: "rgba(74, 222, 128, 0.35)",
                            background: "rgba(74, 222, 128, 0.08)",
                          }
                        : undefined
                    }
                  >
                    {completed ? (
                      <Check
                        size={17}
                        strokeWidth={
                          2.2
                        }
                      />
                    ) : (
                      <Circle
                        size={16}
                        strokeWidth={
                          1.5
                        }
                      />
                    )}
                  </span>

                  <span
                    className={`habit-status ${
                      completed
                        ? "completed"
                        : ""
                    } ${
                      notCompleted
                        ? "not-completed"
                        : ""
                    }`}
                    style={
                      completed
                        ? {
                            color: "#4ade80",
                            borderColor: "rgba(74, 222, 128, 0.30)",
                            background: "rgba(74, 222, 128, 0.08)",
                          }
                        : undefined
                    }
                  >
                    {completed
                      ? "Completed"
                      : notCompleted
                        ? "Not Completed"
                        : "Pending"}
                  </span>
                </div>

                <div className="habit-card-content">
                  <strong>
                    {
                      commitment.label
                    }
                  </strong>

                  <span>
                    {completed
                      ? "Commitment completed"
                      : notCompleted
                        ? "Marked as not completed"
                        : "Tap to mark complete"}
                  </span>
                </div>

                <div
                  className={`habit-check ${
                    completed
                      ? "completed"
                      : ""
                  } ${
                    notCompleted
                      ? "not-completed"
                      : ""
                  }`}
                  style={
                    completed
                      ? {
                          color: "#4ade80",
                          borderColor: "rgba(74, 222, 128, 0.40)",
                          background: "rgba(74, 222, 128, 0.12)",
                        }
                      : undefined
                  }
                >
                  {completed && (
                    <Check
                      size={13}
                      strokeWidth={
                        2.4
                      }
                    />
                  )}
                </div>
              </button>
            );
          }
        )}
      </div>
    </section>
  );
}

export default DailyHabits;