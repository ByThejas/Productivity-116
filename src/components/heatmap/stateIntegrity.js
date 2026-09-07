/*
  Phase 10A-5 — Cross-State Consistency Check

  Read-only integrity helpers.

  This module does NOT mutate localStorage.
  It checks whether persisted journey-related
  state stores are structurally compatible with
  the current journey configuration.
*/

export const INTEGRITY_STORAGE_KEYS = {
  journeyConfig: "productivity-journey-config-v1",
  journeyState: "productivity-116-habits-v3",
  hydration: "productivity-116-water-v1",
  focusSessions: "productivity-116-focus-v1",
  milestones: "productivity-journey-milestones-v1",
  dayTransition: "productivity-journey-day-transition-v1",
  journeyCompletion: "productivity-journey-completion-v1",
  theme: "productivity-theme-v1",
};

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function readStorageValue(key) {
  try {
    const raw = localStorage.getItem(key);

    if (raw === null) {
      return {
        exists: false,
        raw: null,
        value: null,
        validJson: true,
      };
    }

    try {
      return {
        exists: true,
        raw,
        value: JSON.parse(raw),
        validJson: true,
      };
    } catch {
      return {
        exists: true,
        raw,
        value: null,
        validJson: false,
      };
    }
  } catch {
    return {
      exists: false,
      raw: null,
      value: null,
      validJson: false,
    };
  }
}

function addIssue(issues, state, message) {
  issues.push({
    state,
    message,
  });
}

function addWarning(warnings, state, message) {
  warnings.push({
    state,
    message,
  });
}

function normalizeDayNumber(value) {
  const number = Number(value);

  if (!Number.isInteger(number) || number < 1) {
    return null;
  }

  return number;
}

function getJourneyKey(config) {
  return [
    config?.startDate || "",
    config?.endDate || "",
    config?.primaryGoal || "",
  ].join("|");
}

function getDateRangeKey(config) {
  return [
    config?.startDate || "",
    config?.endDate || "",
  ].join("|");
}

function validateJourneyState(
  value,
  commitments,
  totalDays,
  issues,
  warnings
) {
  if (!isPlainObject(value)) {
    addIssue(
      issues,
      "journeyState",
      "Daily commitment state must be an object."
    );

    return;
  }

  const commitmentIds = new Set(
    commitments.map((commitment) => commitment.id)
  );

  Object.entries(value).forEach(
    ([dayKey, dayState]) => {
      const dayNumber = normalizeDayNumber(dayKey);

      if (dayNumber === null) {
        addIssue(
          issues,
          "journeyState",
          `Invalid journey day key "${dayKey}".`
        );

        return;
      }

      if (!isPlainObject(dayState)) {
        addIssue(
          issues,
          "journeyState",
          `Day ${dayNumber} state must be an object.`
        );

        return;
      }

      if (dayNumber > totalDays) {
        addWarning(
          warnings,
          "journeyState",
          `Day ${dayNumber} exists outside the current ${totalDays}-day journey.`
        );
      }

      Object.entries(dayState).forEach(
        ([commitmentId, status]) => {
          if (!commitmentIds.has(commitmentId)) {
            addWarning(
              warnings,
              "journeyState",
              `Day ${dayNumber} contains unknown commitment "${commitmentId}".`
            );
          }

          if (
            status !== true &&
            status !== false &&
            status !== null
          ) {
            addIssue(
              issues,
              "journeyState",
              `Day ${dayNumber}, commitment "${commitmentId}" has an invalid status.`
            );
          }
        }
      );
    }
  );
}

function validateHydrationState(value, issues) {
  if (!isPlainObject(value)) {
    addIssue(
      issues,
      "hydration",
      "Hydration state must be an object keyed by journey day."
    );

    return;
  }

  Object.entries(value).forEach(
    ([dayKey, amount]) => {
      if (normalizeDayNumber(dayKey) === null) {
        addIssue(
          issues,
          "hydration",
          `Invalid hydration day key "${dayKey}".`
        );

        return;
      }

      const numericAmount = Number(amount);

      if (
        !Number.isFinite(numericAmount) ||
        numericAmount < 0
      ) {
        addIssue(
          issues,
          "hydration",
          `Day ${dayKey} has an invalid hydration amount.`
        );

        return;
      }

      if (numericAmount % 500 !== 0) {
        addIssue(
          issues,
          "hydration",
          `Day ${dayKey} hydration is not aligned to the 500 ml step.`
        );
      }
    }
  );
}

function validateFocusSessions(
  value,
  totalDays,
  issues,
  warnings
) {
  if (!Array.isArray(value)) {
    addIssue(
      issues,
      "focusSessions",
      "Focus session state must be an array."
    );

    return;
  }

  value.forEach((session, index) => {
    if (!isPlainObject(session)) {
      addIssue(
        issues,
        "focusSessions",
        `Focus session ${index + 1} must be an object.`
      );

      return;
    }

    if (
      session.journeyDay !== undefined &&
      normalizeDayNumber(session.journeyDay) === null
    ) {
      addIssue(
        issues,
        "focusSessions",
        `Focus session ${index + 1} has an invalid journey day.`
      );
    }

    if (
      Number.isInteger(Number(session.journeyDay)) &&
      Number(session.journeyDay) > totalDays
    ) {
      addWarning(
        warnings,
        "focusSessions",
        `Focus session ${index + 1} references day ${session.journeyDay}, outside the current ${totalDays}-day journey.`
      );
    }

    if (
      session.completedAt !== undefined &&
      Number.isNaN(
        new Date(session.completedAt).getTime()
      )
    ) {
      addIssue(
        issues,
        "focusSessions",
        `Focus session ${index + 1} has an invalid completion timestamp.`
      );
    }

    if (
      session.durationMinutes !== undefined &&
      (
        !Number.isFinite(
          Number(session.durationMinutes)
        ) ||
        Number(session.durationMinutes) < 0
      )
    ) {
      addIssue(
        issues,
        "focusSessions",
        `Focus session ${index + 1} has an invalid duration.`
      );
    }
  });
}

function validateMilestoneState(
  value,
  config,
  totalDays,
  issues,
  warnings
) {
  if (!isPlainObject(value)) {
    addIssue(
      issues,
      "milestones",
      "Milestone state must be an object."
    );

    return;
  }

  const currentKey = getJourneyKey(config);

  Object.entries(value).forEach(
    ([journeyKey, journeyState]) => {
      if (!isPlainObject(journeyState)) {
        addIssue(
          issues,
          "milestones",
          `Milestone entry "${journeyKey}" must be an object.`
        );

        return;
      }

      if (journeyKey !== currentKey) {
        return;
      }

      const reached = journeyState.reached;

      if (
        reached !== undefined &&
        !Array.isArray(reached)
      ) {
        addIssue(
          issues,
          "milestones",
          "Current journey milestone 'reached' value must be an array."
        );

        return;
      }

      if (Array.isArray(reached)) {
        reached.forEach((day) => {
          const dayNumber = normalizeDayNumber(day);

          if (dayNumber === null) {
            addIssue(
              issues,
              "milestones",
              "Current journey contains an invalid reached milestone day."
            );
          } else if (dayNumber > totalDays) {
            addWarning(
              warnings,
              "milestones",
              `Reached milestone day ${dayNumber} is outside the current journey.`
            );
          }
        });
      }
    }
  );
}

function validateDayTransitionState(
  value,
  config,
  issues
) {
  if (!isPlainObject(value)) {
    addIssue(
      issues,
      "dayTransition",
      "Day-transition state must be an object."
    );

    return;
  }

  const currentKey = getDateRangeKey(config);

  Object.entries(value).forEach(
    ([journeyKey, journeyState]) => {
      if (!isPlainObject(journeyState)) {
        addIssue(
          issues,
          "dayTransition",
          `Day-transition entry "${journeyKey}" must be an object.`
        );

        return;
      }

      if (
        journeyKey === currentKey &&
        journeyState.localDateKey !== undefined &&
        typeof journeyState.localDateKey !== "string"
      ) {
        addIssue(
          issues,
          "dayTransition",
          "Current day-transition localDateKey must be a string."
        );
      }
    }
  );
}

function validateJourneyCompletionState(
  value,
  config,
  issues
) {
  if (!isPlainObject(value)) {
    addIssue(
      issues,
      "journeyCompletion",
      "Journey-completion state must be an object."
    );

    return;
  }

  const currentKey = getJourneyKey(config);

  Object.entries(value).forEach(
    ([journeyKey, journeyState]) => {
      if (!isPlainObject(journeyState)) {
        addIssue(
          issues,
          "journeyCompletion",
          `Completion entry "${journeyKey}" must be an object.`
        );

        return;
      }

      if (
        journeyKey === currentKey &&
        journeyState.completedAt !== undefined &&
        Number.isNaN(
          new Date(
            journeyState.completedAt
          ).getTime()
        )
      ) {
        addIssue(
          issues,
          "journeyCompletion",
          "Current journey completion timestamp is invalid."
        );
      }
    }
  );
}

function validateTheme(value, issues) {
  if (value === null) {
    return;
  }

  if (
    value !== "dark" &&
    value !== "light" &&
    value !== "system"
  ) {
    addIssue(
      issues,
      "theme",
      "Theme preference must be dark, light, or system."
    );
  }
}

export function readIntegritySnapshot() {
  return Object.fromEntries(
    Object.entries(INTEGRITY_STORAGE_KEYS).map(
      ([name, key]) => [
        name,
        readStorageValue(key),
      ]
    )
  );
}

export function checkCrossStateConsistency(
  config,
  snapshot = readIntegritySnapshot()
) {
  const issues = [];
  const warnings = [];

  if (!isPlainObject(config)) {
    addIssue(
      issues,
      "journeyConfig",
      "Journey configuration must be an object."
    );

    return {
      ok: false,
      issues,
      warnings,
      journeyKey: "",
      dateRangeKey: "",
      totalDays: 0,
      commitmentCount: 0,
      snapshot,
    };
  }

  const commitments = Array.isArray(
    config.commitments
  )
    ? config.commitments.filter(
        (commitment) =>
          isPlainObject(commitment) &&
          typeof commitment.id === "string"
      )
    : [];

  const startDate = config.startDate;
  const endDate = config.endDate;

  if (
    typeof startDate !== "string" ||
    typeof endDate !== "string"
  ) {
    addIssue(
      issues,
      "journeyConfig",
      "Journey configuration must contain startDate and endDate strings."
    );
  }

  if (
    typeof config.primaryGoal !== "string" ||
    !config.primaryGoal.trim()
  ) {
    addIssue(
      issues,
      "journeyConfig",
      "Journey configuration must contain a primary goal."
    );
  }

  if (commitments.length === 0) {
    addWarning(
      warnings,
      "journeyConfig",
      "The current journey has no configured commitments."
    );
  }

  const start =
    startDate
      ? new Date(`${startDate}T00:00:00`)
      : null;

  const end =
    endDate
      ? new Date(`${endDate}T00:00:00`)
      : null;

  const validDates =
    start instanceof Date &&
    !Number.isNaN(start.getTime()) &&
    end instanceof Date &&
    !Number.isNaN(end.getTime());

  if (!validDates) {
    addIssue(
      issues,
      "journeyConfig",
      "Journey dates are invalid."
    );
  }

  if (validDates && end < start) {
    addIssue(
      issues,
      "journeyConfig",
      "Journey end date is before the start date."
    );
  }

  const totalDays =
    validDates && end >= start
      ? Math.floor(
          (end - start) /
            (1000 * 60 * 60 * 24)
        ) + 1
      : 0;

  if (
    snapshot.journeyState?.exists &&
    snapshot.journeyState.validJson
  ) {
    validateJourneyState(
      snapshot.journeyState.value,
      commitments,
      totalDays,
      issues,
      warnings
    );
  }

  if (
    snapshot.hydration?.exists &&
    snapshot.hydration.validJson
  ) {
    validateHydrationState(
      snapshot.hydration.value,
      issues
    );
  }

  if (
    snapshot.focusSessions?.exists &&
    snapshot.focusSessions.validJson
  ) {
    validateFocusSessions(
      snapshot.focusSessions.value,
      totalDays,
      issues,
      warnings
    );
  }

  if (
    snapshot.milestones?.exists &&
    snapshot.milestones.validJson
  ) {
    validateMilestoneState(
      snapshot.milestones.value,
      config,
      totalDays,
      issues,
      warnings
    );
  }

  if (
    snapshot.dayTransition?.exists &&
    snapshot.dayTransition.validJson
  ) {
    validateDayTransitionState(
      snapshot.dayTransition.value,
      config,
      issues
    );
  }

  if (
    snapshot.journeyCompletion?.exists &&
    snapshot.journeyCompletion.validJson
  ) {
    validateJourneyCompletionState(
      snapshot.journeyCompletion.value,
      config,
      issues
    );
  }

  if (
    snapshot.theme?.exists &&
    snapshot.theme.validJson
  ) {
    validateTheme(
      snapshot.theme.value,
      issues
    );
  }

  Object.entries(snapshot).forEach(
    ([name, state]) => {
      if (
        state.exists &&
        !state.validJson
      ) {
        addIssue(
          issues,
          name,
          "Stored value contains invalid JSON."
        );
      }
    }
  );

  return {
    ok: issues.length === 0,
    issues,
    warnings,
    journeyKey: getJourneyKey(config),
    dateRangeKey: getDateRangeKey(config),
    totalDays,
    commitmentCount: commitments.length,
    snapshot,
  };
}