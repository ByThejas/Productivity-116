import {
  CURRENT_MIGRATION_VERSION,
  createMigration,
  createMigrationRegistry,
  registerMigration,
  runMigrations,
  readMigrationState,
} from "./migrationManager";

export const DEFAULT_START_DATE =
  new Date(2026, 8, 7);

export const DEFAULT_END_DATE =
  new Date(2026, 11, 31);

export const DEFAULT_HABITS = [
  {
    id: "wake",
    label: "Wake before 5 AM",
  },
  {
    id: "sleep",
    label: "Sleep before 12 AM",
  },
  {
    id: "gym",
    label: "Gym",
  },
];

export const JOURNEY_CONFIG_STORAGE_KEY =
  "productivity-journey-config-v1";

const JOURNEY_CONFIG_BACKUP_STORAGE_KEY =
  "productivity-journey-config-backup-v1";

const JOURNEY_MIGRATION_STORAGE_KEY =
  "productivity-journey-migration-v1";

const WATER_COMMITMENT_ID =
  "water";

export const DEFAULT_COMMITMENTS =
  DEFAULT_HABITS;

export function normalizeDate(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

export function formatDateForStorage(date) {
  const normalized = normalizeDate(date);

  const year =
    normalized.getFullYear();

  const month = String(
    normalized.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    normalized.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function parseStoredDate(
  dateString
) {
  if (!dateString) {
    return null;
  }

  const parts =
    dateString.split("-");

  if (parts.length !== 3) {
    return null;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  const date = new Date(
    year,
    month - 1,
    day
  );

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return normalizeDate(date);
}

export function calculateJourneyDuration(
  startDate,
  endDate
) {
  const start =
    normalizeDate(startDate);

  const end =
    normalizeDate(endDate);

  const difference =
    end.getTime() -
    start.getTime();

  if (difference < 0) {
    return 0;
  }

  return (
    Math.round(
      difference /
        (1000 * 60 * 60 * 24)
    ) + 1
  );
}

export function createDefaultJourneyConfig() {
  return {
    primaryGoal: "",
    startDate:
      formatDateForStorage(
        DEFAULT_START_DATE
      ),
    endDate:
      formatDateForStorage(
        DEFAULT_END_DATE
      ),
    commitments:
      DEFAULT_COMMITMENTS.map(
        (commitment) => ({
          ...commitment,
        })
      ),
  };
}

function normalizeCommitments(
  commitments
) {
  if (!Array.isArray(commitments)) {
    return DEFAULT_COMMITMENTS.map(
      (commitment) => ({
        ...commitment,
      })
    );
  }

  const normalized =
    commitments
      .map((commitment) => {
        if (
          !commitment ||
          typeof commitment !==
            "object"
        ) {
          return null;
        }

        const id =
          typeof commitment.id ===
          "string"
            ? commitment.id.trim()
            : "";

        const label =
          typeof commitment.label ===
          "string"
            ? commitment.label.trim()
            : "";

        if (!id || !label) {
          return null;
        }

        return {
          id,
          label,
        };
      })
      .filter(Boolean);

  if (normalized.length === 0) {
    return DEFAULT_COMMITMENTS.map(
      (commitment) => ({
        ...commitment,
      })
    );
  }

  const uniqueCommitments = [];
  const usedIds = new Set();

  normalized.forEach(
    (commitment) => {
      if (
        usedIds.has(commitment.id)
      ) {
        return;
      }

      usedIds.add(commitment.id);
      uniqueCommitments.push(
        commitment
      );
    }
  );

  return uniqueCommitments;
}

function readStorageItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function backupJourneyConfig(config) {
  if (!config) {
    return false;
  }

  try {
    const serialized = JSON.stringify(config);

    if (!serialized) {
      return false;
    }

    return writeStorageItem(
      JOURNEY_CONFIG_BACKUP_STORAGE_KEY,
      serialized
    );
  } catch {
    return false;
  }
}

function parseAndNormalizeJourneyConfig(serialized) {
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

    const startDate = parseStoredDate(
      parsed.startDate
    );

    const endDate = parseStoredDate(
      parsed.endDate
    );

    if (!startDate || !endDate) {
      return null;
    }

    if (endDate < startDate) {
      return null;
    }

    return {
      primaryGoal:
        typeof parsed.primaryGoal === "string"
          ? parsed.primaryGoal.trim()
          : "",

      startDate:
        formatDateForStorage(startDate),

      endDate:
        formatDateForStorage(endDate),

      commitments:
        normalizeCommitments(
          parsed.commitments
        ),
    };
  } catch {
    return null;
  }
}

/*
  Removes the legacy Water commitment
  from an existing journey configuration.

  Hydration itself is stored separately
  and is intentionally not touched.
*/
function migrateLegacyWaterCommitment(
  config
) {
  if (
    !config ||
    !Array.isArray(
      config.commitments
    )
  ) {
    return config;
  }

  const migrationComplete =
    readStorageItem(
      JOURNEY_MIGRATION_STORAGE_KEY
    );

  if (migrationComplete === "water-v1") {
    return config;
  }

  const filteredCommitments =
    config.commitments.filter(
      (commitment) => {
        if (
          !commitment ||
          typeof commitment !==
            "object"
        ) {
          return false;
        }

        const id =
          typeof commitment.id ===
          "string"
            ? commitment.id
                .trim()
                .toLowerCase()
            : "";

        const label =
          typeof commitment.label ===
          "string"
            ? commitment.label
                .trim()
                .toLowerCase()
            : "";

        if (
          id === WATER_COMMITMENT_ID
        ) {
          return false;
        }

        /*
          Remove the old default water
          commitment even if it somehow
          received a different ID.
        */
        if (
          label === "4l of water" ||
          label === "4l water" ||
          label === "water"
        ) {
          return false;
        }

        return true;
      }
    );

  const migratedConfig = {
    ...config,
    commitments:
      filteredCommitments,
  };

  backupJourneyConfig(config);

  writeStorageItem(
    JOURNEY_CONFIG_STORAGE_KEY,
    JSON.stringify(migratedConfig)
  );

  writeStorageItem(
    JOURNEY_MIGRATION_STORAGE_KEY,
    "water-v1"
  );

  return migratedConfig;
}


/*
  Phase 10B-2 — Journey Config Migration

  Migration version 1 establishes the current
  journey configuration shape without changing
  valid user data.

  The migration is intentionally idempotent:
  running it again produces the same normalized
  configuration.
*/
const JOURNEY_CONFIG_MIGRATION_VERSION = 1;

function migrateJourneyConfigShape(config) {
  if (
    !config ||
    typeof config !== "object" ||
    Array.isArray(config)
  ) {
    return null;
  }

  const startDate = parseStoredDate(
    config.startDate
  );

  const endDate = parseStoredDate(
    config.endDate
  );

  if (!startDate || !endDate || endDate < startDate) {
    return null;
  }

  return {
    primaryGoal:
      typeof config.primaryGoal === "string"
        ? config.primaryGoal.trim()
        : "",

    startDate:
      formatDateForStorage(startDate),

    endDate:
      formatDateForStorage(endDate),

    commitments:
      normalizeCommitments(
        config.commitments
      ),
  };
}

function validateMigratedJourneyConfig(
  config
) {
  return Boolean(
    migrateJourneyConfigShape(config)
  );
}

function createJourneyConfigMigrationRegistry() {
  const registry =
    createMigrationRegistry();

  const registered = registerJourneyConfigMigration(
    registry
  );

  return registered ? registry : null;
}

function registerJourneyConfigMigration(
  registry
) {
  return registry.set(
    JOURNEY_CONFIG_MIGRATION_VERSION,
    createMigration(
      JOURNEY_CONFIG_MIGRATION_VERSION,
      "Journey Config v1",
      (config) =>
        migrateJourneyConfigShape(config),
      (config) =>
        validateMigratedJourneyConfig(config)
    )
  );
}

function migrateStoredJourneyConfig(
  serialized
) {
  if (!serialized) {
    return null;
  }

  let parsed;

  try {
    parsed = JSON.parse(serialized);
  } catch {
    return null;
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    return null;
  }

  const registry =
    createJourneyConfigMigrationRegistry();

  if (!registry) {
    return null;
  }

  const migrationState =
    readMigrationState();

  const currentVersion = Math.min(
    Math.max(
      0,
      Number(migrationState.version) || 0
    ),
    CURRENT_MIGRATION_VERSION
  );

  /*
    Config migration is domain-safe even when the
    global migration state is ahead. In that case,
    normalize directly rather than attempting to
    downgrade the migration state.
  */
  if (
    currentVersion >=
    JOURNEY_CONFIG_MIGRATION_VERSION
  ) {
    return migrateJourneyConfigShape(
      parsed
    );
  }

  const result = runMigrations(
    registry,
    parsed,
    {
      currentVersion,
      targetVersion:
        JOURNEY_CONFIG_MIGRATION_VERSION,
      dryRun: false,
    }
  );

  if (!result.ok) {
    return null;
  }

  return result.data;
}

function persistMigratedJourneyConfig(
  serialized
) {
  const migratedConfig =
    migrateStoredJourneyConfig(
      serialized
    );

  if (!migratedConfig) {
    return null;
  }

  const migratedSerialized =
    JSON.stringify(
      migratedConfig
    );

  if (
    migratedSerialized !== serialized
  ) {
    const saved =
      writeStorageItem(
        JOURNEY_CONFIG_STORAGE_KEY,
        migratedSerialized
      );

    if (!saved) {
      return null;
    }

    window.dispatchEvent(
      new Event(
        "journey-config-updated"
      )
    );
  }

  return migratedConfig;
}

export function loadJourneyConfig() {
  const fallback =
    createDefaultJourneyConfig();

  const saved =
    readStorageItem(
      JOURNEY_CONFIG_STORAGE_KEY
    );

  const migratedSaved =
    persistMigratedJourneyConfig(
      saved
    );

  const normalizedSaved =
    parseAndNormalizeJourneyConfig(
      migratedSaved
        ? JSON.stringify(migratedSaved)
        : saved
    );

  if (normalizedSaved) {
    return migrateLegacyWaterCommitment(
      normalizedSaved
    );
  }

  const backup =
    readStorageItem(
      JOURNEY_CONFIG_BACKUP_STORAGE_KEY
    );

  const normalizedBackup =
    parseAndNormalizeJourneyConfig(
      backup
    );

  if (normalizedBackup) {
    const recoveredConfig =
      migrateLegacyWaterCommitment(
        normalizedBackup
      );

    const recoveredSerialized =
      JSON.stringify(
        recoveredConfig
      );

    const restored =
      writeStorageItem(
        JOURNEY_CONFIG_STORAGE_KEY,
        recoveredSerialized
      );

    if (restored) {
      window.dispatchEvent(
        new Event(
          "journey-config-updated"
        )
      );
    }

    return recoveredConfig;
  }

  return fallback;
}

export function saveJourneyConfig(
  config
) {
  const startDate =
    parseStoredDate(
      config?.startDate
    );

  const endDate =
    parseStoredDate(
      config?.endDate
    );

  if (!startDate || !endDate) {
    return false;
  }

  if (endDate < startDate) {
    return false;
  }

  const normalizedConfig = {
    primaryGoal:
      typeof config?.primaryGoal ===
      "string"
        ? config.primaryGoal.trim()
        : "",

    startDate:
      formatDateForStorage(
        startDate
      ),

    endDate:
      formatDateForStorage(
        endDate
      ),

    commitments:
      normalizeCommitments(
        config?.commitments
      ),
  };

  const existingConfig =
    loadJourneyConfig();

  backupJourneyConfig(existingConfig);

  const saved = writeStorageItem(
    JOURNEY_CONFIG_STORAGE_KEY,
    JSON.stringify(normalizedConfig)
  );

  if (!saved) {
    return false;
  }

  writeStorageItem(
    JOURNEY_MIGRATION_STORAGE_KEY,
    "water-v1"
  );

  window.dispatchEvent(
    new Event(
      "journey-config-updated"
    )
  );

  return true;
}

export function getJourneyDuration(
  config
) {
  if (!config) {
    return 0;
  }

  const startDate =
    parseStoredDate(
      config.startDate
    );

  const endDate =
    parseStoredDate(
      config.endDate
    );

  if (!startDate || !endDate) {
    return 0;
  }

  return calculateJourneyDuration(
    startDate,
    endDate
  );
}


/*
  Phase 10B-3 — Commitment & Day-State Migration

  Version 2 establishes the current journey day-state
  shape against the active commitment configuration.

  Historical day numbers are intentionally preserved even
  when the current journey range changes. Only commitment
  keys that belong to the active configuration are carried
  forward.
*/
const JOURNEY_STATE_STORAGE_KEY =
  "productivity-116-habits-v3";

const JOURNEY_STATE_BACKUP_STORAGE_KEY =
  "productivity-116-habits-backup-v1";

const JOURNEY_STATE_MIGRATION_VERSION = 2;

function normalizeJourneyStateShape(
  journeyState,
  config
) {
  if (
    !journeyState ||
    typeof journeyState !== "object" ||
    Array.isArray(journeyState)
  ) {
    return {};
  }

  const commitments = getJourneyCommitments(config);
  const normalized = {};

  Object.entries(journeyState).forEach(
    ([dayKey, dayState]) => {
      const dayNumber = Number(dayKey);

      if (
        !Number.isInteger(dayNumber) ||
        dayNumber < 1
      ) {
        return;
      }

      if (
        !dayState ||
        typeof dayState !== "object" ||
        Array.isArray(dayState)
      ) {
        return;
      }

      const normalizedDay = {};
      let hasMeaningfulState = false;

      commitments.forEach((commitment) => {
        const status = dayState[commitment.id];

        if (
          status === true ||
          status === false ||
          status === null
        ) {
          normalizedDay[commitment.id] = status;

          if (
            status === true ||
            status === false
          ) {
            hasMeaningfulState = true;
          }
        } else {
          normalizedDay[commitment.id] = null;
        }
      });

      if (hasMeaningfulState) {
        normalized[dayNumber] = normalizedDay;
      }
    }
  );

  return normalized;
}

function areJourneyStatesEqual(
  first,
  second
) {
  try {
    return (
      JSON.stringify(first) ===
      JSON.stringify(second)
    );
  } catch {
    return false;
  }
}

function migrateJourneyDayState(
  journeyState,
  config
) {
  return normalizeJourneyStateShape(
    journeyState,
    config
  );
}

function validateMigratedJourneyDayState(
  journeyState,
  config
) {
  if (
    !journeyState ||
    typeof journeyState !== "object" ||
    Array.isArray(journeyState)
  ) {
    return false;
  }

  const normalized =
    normalizeJourneyStateShape(
      journeyState,
      config
    );

  return areJourneyStatesEqual(
    normalized,
    journeyState
  );
}

function createJourneyStateMigrationRegistry(
  config
) {
  const registry =
    createMigrationRegistry();

  registerMigration(
    registry,
    JOURNEY_STATE_MIGRATION_VERSION,
    createMigration(
      JOURNEY_STATE_MIGRATION_VERSION,
      "Commitment & Day-State v2",
      (journeyState) =>
        migrateJourneyDayState(
          journeyState,
          config
        ),
      (journeyState) =>
        validateMigratedJourneyDayState(
          journeyState,
          config
        )
    )
  );

  return registry;
}

function parseStoredJourneyState(
  serialized
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

    return parsed;
  } catch {
    return null;
  }
}

export function migrateStoredJourneyState(
  serialized,
  config
) {
  const parsed =
    parseStoredJourneyState(serialized);

  if (!parsed) {
    return null;
  }

  const migrationState =
    readMigrationState();

  const currentVersion = Math.min(
    Math.max(
      0,
      Number(migrationState.version) || 0
    ),
    CURRENT_MIGRATION_VERSION
  );

  const registry =
    createJourneyStateMigrationRegistry(
      config
    );

  if (
    currentVersion >=
    JOURNEY_STATE_MIGRATION_VERSION
  ) {
    return migrateJourneyDayState(
      parsed,
      config
    );
  }

  const result = runMigrations(
    registry,
    parsed,
    {
      currentVersion,
      targetVersion:
        JOURNEY_STATE_MIGRATION_VERSION,
      dryRun: false,
    }
  );

  if (!result.ok) {
    return null;
  }

  return result.data;
}

export function normalizeJourneyStateForConfig(
  journeyState,
  config
) {
  if (
    !journeyState ||
    typeof journeyState !== "object" ||
    Array.isArray(journeyState)
  ) {
    return {};
  }

  const commitments = getJourneyCommitments(config);
  const normalized = {};

  Object.entries(journeyState).forEach(
    ([dayKey, dayState]) => {
      const dayNumber = Number(dayKey);

      if (
        !Number.isInteger(dayNumber) ||
        dayNumber < 1
      ) {
        return;
      }

      if (
        !dayState ||
        typeof dayState !== "object" ||
        Array.isArray(dayState)
      ) {
        return;
      }

      const normalizedDay = {};
      let hasMeaningfulState = false;

      commitments.forEach((commitment) => {
        const status = dayState[commitment.id];

        if (
          status === true ||
          status === false ||
          status === null
        ) {
          normalizedDay[commitment.id] = status;

          if (status === true || status === false) {
            hasMeaningfulState = true;
          }
        } else {
          normalizedDay[commitment.id] = null;
        }
      });

      if (hasMeaningfulState) {
        normalized[dayNumber] = normalizedDay;
      }
    }
  );

  return normalized;
}

export function getJourneyCommitments(
  config
) {
  if (!config) {
    return DEFAULT_COMMITMENTS;
  }

  return normalizeCommitments(
    config.commitments
  );
}

export function createCommitmentId() {
  return `commitment-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/*
  Compatibility exports.

  These keep the existing dashboard
  working while the dynamic journey
  configuration is introduced.
*/

export const START_DATE =
  DEFAULT_START_DATE;

export const END_DATE =
  DEFAULT_END_DATE;

export const HABITS =
  DEFAULT_HABITS;

export const DAY_COUNT =
  calculateJourneyDuration(
    START_DATE,
    END_DATE
  );

export function createJourneyDays(
  startDate = START_DATE,
  endDate = END_DATE
) {
  const start =
    normalizeDate(startDate);

  const end =
    normalizeDate(endDate);

  const dayCount =
    calculateJourneyDuration(
      start,
      end
    );

  return Array.from(
    { length: dayCount },
    (_, index) => {
      const date =
        new Date(start);

      date.setDate(
        start.getDate() + index
      );

      return {
        index,
        dayNumber: index + 1,
        date,

        month:
          date.toLocaleString(
            "en-US",
            {
              month: "short",
            }
          ),

        shortDate:
          date.toLocaleDateString(
            "en-US",
            {
              month: "short",
              day: "numeric",
            }
          ),

        fullDate:
          date.toLocaleDateString(
            "en-US",
            {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            }
          ),
      };
    }
  );
}

export function createEmptyHabitState(
  habits = HABITS
) {
  return habits.reduce(
    (state, habit) => {
      state[habit.id] = null;
      return state;
    },
    {}
  );
}

export function createEmptyCommitmentState(
  commitments
) {
  return createEmptyHabitState(
    getJourneyCommitments({
      commitments,
    })
  );
}

export function getDayCompletion(
  dayState,
  habits = HABITS
) {
  if (!dayState) {
    return 0;
  }

  return habits.reduce(
    (completed, habit) => {
      return (
        completed +
        (dayState[habit.id]
          ? 1
          : 0)
      );
    },
    0
  );
}

export function getCommitmentCompletion(
  dayState,
  commitments
) {
  const normalizedCommitments =
    getJourneyCommitments({
      commitments,
    });

  return getDayCompletion(
    dayState,
    normalizedCommitments
  );
}

/*
  ========================================
  JOURNEY INTELLIGENCE
  ========================================
*/

/*
  Returns a normalized list of journey
  day numbers.
*/
export function createJourneyDayNumbers(
  totalDays
) {
  const safeTotalDays =
    Math.max(
      0,
      Number(totalDays) || 0
    );

  return Array.from(
    {
      length: safeTotalDays,
    },
    (_, index) =>
      index + 1
  );
}

/*
  Returns the completion percentage
  for one journey day.
*/
export function getDayCompletionPercentage(
  dayState,
  commitments
) {
  const normalizedCommitments =
    getJourneyCommitments({
      commitments,
    });

  if (
    normalizedCommitments.length === 0
  ) {
    return 0;
  }

  const completed =
    getCommitmentCompletion(
      dayState,
      normalizedCommitments
    );

  return Math.round(
    (completed /
      normalizedCommitments.length) *
      100
  );
}

/*
  Calculates overall commitment
  consistency across the journey.
*/
export function calculateOverallConsistency(
  journeyState,
  totalDays,
  commitments
) {
  const normalizedCommitments =
    getJourneyCommitments({
      commitments,
    });

  const safeTotalDays =
    Math.max(
      0,
      Number(totalDays) || 0
    );

  if (
    normalizedCommitments.length === 0 ||
    safeTotalDays === 0
  ) {
    return 0;
  }

  const totalPossible =
    safeTotalDays *
    normalizedCommitments.length;

  let totalCompleted = 0;

  for (
    let dayNumber = 1;
    dayNumber <= safeTotalDays;
    dayNumber += 1
  ) {
    totalCompleted +=
      getCommitmentCompletion(
        journeyState?.[dayNumber],
        normalizedCommitments
      );
  }

  return Math.round(
    (totalCompleted /
      totalPossible) *
      100
  );
}

/*
  Calculates performance for every
  commitment.
*/
export function calculateCommitmentPerformance(
  journeyState,
  totalDays,
  commitments
) {
  const normalizedCommitments =
    getJourneyCommitments({
      commitments,
    });

  const safeTotalDays =
    Math.max(
      0,
      Number(totalDays) || 0
    );

  return normalizedCommitments.map(
    (commitment) => {
      let completedDays = 0;

      for (
        let dayNumber = 1;
        dayNumber <= safeTotalDays;
        dayNumber += 1
      ) {
        if (
          journeyState?.[
            dayNumber
          ]?.[commitment.id] === true
        ) {
          completedDays += 1;
        }
      }

      const percentage =
        safeTotalDays === 0
          ? 0
          : Math.round(
              (completedDays /
                safeTotalDays) *
                100
            );

      return {
        ...commitment,
        completedDays,
        percentage,
      };
    }
  );
}

/*
  Calculates current and best streak
  for every commitment.
*/
export function calculateCommitmentConsistency(
  journeyState,
  totalDays,
  commitments
) {
  const normalizedCommitments =
    getJourneyCommitments({
      commitments,
    });

  const safeTotalDays =
    Math.max(
      0,
      Number(totalDays) || 0
    );

  return normalizedCommitments.map(
    (commitment) => {
      let currentStreak = 0;
      let bestStreak = 0;
      let runningStreak = 0;

      for (
        let dayNumber = 1;
        dayNumber <= safeTotalDays;
        dayNumber += 1
      ) {
        const completed =
          journeyState?.[
            dayNumber
          ]?.[commitment.id] === true;

        if (completed) {
          runningStreak += 1;

          bestStreak =
            Math.max(
              bestStreak,
              runningStreak
            );
        } else {
          runningStreak = 0;
        }
      }

      for (
        let dayNumber = safeTotalDays;
        dayNumber >= 1;
        dayNumber -= 1
      ) {
        const completed =
          journeyState?.[
            dayNumber
          ]?.[commitment.id] === true;

        if (completed) {
          currentStreak += 1;
        } else {
          break;
        }
      }

      return {
        ...commitment,
        currentStreak,
        bestStreak,
      };
    }
  );
}

/*
  Calculates completed, partial and
  untouched journey days.
*/
export function calculateJourneyDayStats(
  journeyState,
  totalDays,
  commitments
) {
  const normalizedCommitments =
    getJourneyCommitments({
      commitments,
    });

  const safeTotalDays =
    Math.max(
      0,
      Number(totalDays) || 0
    );

  const days =
    createJourneyDayNumbers(
      safeTotalDays
    );

  const dayStats =
    days.map(
      (dayNumber) => {
        const completed =
          getCommitmentCompletion(
            journeyState?.[
              dayNumber
            ],
            normalizedCommitments
          );

        const isComplete =
          normalizedCommitments.length >
            0 &&
          completed ===
            normalizedCommitments.length;

        return {
          dayNumber,
          completed,
          isComplete,
          isPartial:
            completed > 0 &&
            !isComplete,
          isUntouched:
            completed === 0,
        };
      }
    );

  const completedDays =
    dayStats.filter(
      (day) => day.isComplete
    ).length;

  const partialDays =
    dayStats.filter(
      (day) => day.isPartial
    ).length;

  const untouchedDays =
    dayStats.filter(
      (day) => day.isUntouched
    ).length;

  const trackedDays =
    completedDays +
    partialDays;

  const completedPercentage =
    safeTotalDays === 0
      ? 0
      : Math.round(
          (completedDays /
            safeTotalDays) *
            100
        );

  return {
    dayStats,
    completedDays,
    partialDays,
    untouchedDays,
    trackedDays,
    completedPercentage,
  };
}

/*
  Calculates the current streak of
  fully completed journey days.
*/
export function calculateCurrentJourneyStreak(
  journeyState,
  totalDays,
  commitments
) {
  const normalizedCommitments =
    getJourneyCommitments({
      commitments,
    });

  const safeTotalDays =
    Math.max(
      0,
      Number(totalDays) || 0
    );

  if (
    normalizedCommitments.length === 0 ||
    safeTotalDays === 0
  ) {
    return 0;
  }

  let streak = 0;

  for (
    let dayNumber = safeTotalDays;
    dayNumber >= 1;
    dayNumber -= 1
  ) {
    const completed =
      getCommitmentCompletion(
        journeyState?.[
          dayNumber
        ],
        normalizedCommitments
      ) ===
      normalizedCommitments.length;

    if (!completed) {
      break;
    }

    streak += 1;
  }

  return streak;
}

/*
  Calculates the longest streak of
  fully completed journey days.
*/
export function calculateBestJourneyStreak(
  journeyState,
  totalDays,
  commitments
) {
  const normalizedCommitments =
    getJourneyCommitments({
      commitments,
    });

  const safeTotalDays =
    Math.max(
      0,
      Number(totalDays) || 0
    );

  if (
    normalizedCommitments.length === 0 ||
    safeTotalDays === 0
  ) {
    return 0;
  }

  let bestStreak = 0;
  let runningStreak = 0;

  for (
    let dayNumber = 1;
    dayNumber <= safeTotalDays;
    dayNumber += 1
  ) {
    const completed =
      getCommitmentCompletion(
        journeyState?.[
          dayNumber
        ],
        normalizedCommitments
      ) ===
      normalizedCommitments.length;

    if (completed) {
      runningStreak += 1;

      bestStreak =
        Math.max(
          bestStreak,
          runningStreak
        );
    } else {
      runningStreak = 0;
    }
  }

  return bestStreak;
}

/*
  Returns the strongest commitment
  based on completed days.
*/
export function getStrongestCommitment(
  performance
) {
  if (
    !Array.isArray(performance) ||
    performance.length === 0
  ) {
    return null;
  }

  return performance.reduce(
    (strongest, commitment) =>
      commitment.completedDays >
      strongest.completedDays
        ? commitment
        : strongest
  );
}

/*
  Returns the weakest commitment
  based on completed days.
*/
export function getWeakestCommitment(
  performance
) {
  if (
    !Array.isArray(performance) ||
    performance.length === 0
  ) {
    return null;
  }

  return performance.reduce(
    (weakest, commitment) =>
      commitment.completedDays <
      weakest.completedDays
        ? commitment
        : weakest
  );
}

/*
  Calculates weekly consistency.
*/
export function calculateWeeklyConsistency(
  journeyState,
  totalDays,
  commitments
) {
  const normalizedCommitments =
    getJourneyCommitments({
      commitments,
    });

  const safeTotalDays =
    Math.max(
      0,
      Number(totalDays) || 0
    );

  if (
    normalizedCommitments.length === 0 ||
    safeTotalDays === 0
  ) {
    return [];
  }

  const weeklyTrend = [];

  for (
    let startDay = 1;
    startDay <= safeTotalDays;
    startDay += 7
  ) {
    const endDay =
      Math.min(
        startDay + 6,
        safeTotalDays
      );

    let totalCompleted = 0;

    const weekLength =
      endDay - startDay + 1;

    for (
      let dayNumber = startDay;
      dayNumber <= endDay;
      dayNumber += 1
    ) {
      totalCompleted +=
        getCommitmentCompletion(
          journeyState?.[
            dayNumber
          ],
          normalizedCommitments
        );
    }

    const totalPossible =
      weekLength *
      normalizedCommitments.length;

    const averageCompletion =
      totalPossible === 0
        ? 0
        : Math.round(
            (totalCompleted /
              totalPossible) *
              100
          );

    const completedDays =
      Array.from(
        {
          length: weekLength,
        },
        (_, index) =>
          startDay + index
      ).filter(
        (dayNumber) =>
          getCommitmentCompletion(
            journeyState?.[
              dayNumber
            ],
            normalizedCommitments
          ) ===
          normalizedCommitments.length
      ).length;

    weeklyTrend.push({
      week:
        weeklyTrend.length + 1,
      startDay,
      endDay,
      completedDays,
      averageCompletion,
    });
  }

  return weeklyTrend;
}

/*
  Returns the strongest week.
*/
export function getStrongestWeek(
  weeklyTrend
) {
  if (
    !Array.isArray(weeklyTrend) ||
    weeklyTrend.length === 0
  ) {
    return {
      week: 0,
      startDay: 0,
      endDay: 0,
      completedDays: 0,
      averageCompletion: 0,
    };
  }

  return weeklyTrend.reduce(
    (strongest, week) =>
      week.averageCompletion >
      strongest.averageCompletion
        ? week
        : strongest,
    weeklyTrend[0]
  );
}

/*
  Returns the weakest week.
*/
export function getWeakestWeek(
  weeklyTrend
) {
  if (
    !Array.isArray(weeklyTrend) ||
    weeklyTrend.length === 0
  ) {
    return {
      week: 0,
      startDay: 0,
      endDay: 0,
      completedDays: 0,
      averageCompletion: 0,
    };
  }

  return weeklyTrend.reduce(
    (weakest, week) =>
      week.averageCompletion <
      weakest.averageCompletion
        ? week
        : weakest,
    weeklyTrend[0]
  );
}

/*
  Creates one complete intelligence
  snapshot for the journey.
*/
export function calculateJourneyIntelligence(
  journeyState,
  totalDays,
  commitments
) {
  const normalizedCommitments =
    getJourneyCommitments({
      commitments,
    });

  const dayStats =
    calculateJourneyDayStats(
      journeyState,
      totalDays,
      normalizedCommitments
    );

  const commitmentPerformance =
    calculateCommitmentPerformance(
      journeyState,
      totalDays,
      normalizedCommitments
    );

  const commitmentConsistency =
    calculateCommitmentConsistency(
      journeyState,
      totalDays,
      normalizedCommitments
    );

  const weeklyTrend =
    calculateWeeklyConsistency(
      journeyState,
      totalDays,
      normalizedCommitments
    );

  const strongestCommitment =
    getStrongestCommitment(
      commitmentPerformance
    );

  const weakestCommitment =
    getWeakestCommitment(
      commitmentPerformance
    );

  const strongestWeek =
    getStrongestWeek(
      weeklyTrend
    );

  const weakestWeek =
    getWeakestWeek(
      weeklyTrend
    );

  const currentStreak =
    calculateCurrentJourneyStreak(
      journeyState,
      totalDays,
      normalizedCommitments
    );

  const bestStreak =
    calculateBestJourneyStreak(
      journeyState,
      totalDays,
      normalizedCommitments
    );

  const overallConsistency =
    calculateOverallConsistency(
      journeyState,
      totalDays,
      normalizedCommitments
    );

  return {
    overallConsistency,

    currentStreak,

    bestStreak,

    completedDays:
      dayStats.completedDays,

    partialDays:
      dayStats.partialDays,

    untouchedDays:
      dayStats.untouchedDays,

    trackedDays:
      dayStats.trackedDays,

    completedPercentage:
      dayStats.completedPercentage,

    commitmentPerformance,

    commitmentConsistency,

    strongestCommitment,

    weakestCommitment,

    weeklyTrend,

    strongestWeek,

    weakestWeek,

    dayStats:
      dayStats.dayStats,
  };
}

/*
  ========================================
  SVG / HEATMAP HELPERS
  ========================================
*/

export function polarToCartesian(
  cx,
  cy,
  radius,
  angle
) {
  const radians =
    ((angle - 90) * Math.PI) / 180;

  return {
    x:
      cx +
      radius *
        Math.cos(radians),

    y:
      cy +
      radius *
        Math.sin(radians),
  };
}

export function createSegmentPath(
  center,
  innerRadius,
  outerRadius,
  startAngle,
  endAngle
) {
  const outerStart =
    polarToCartesian(
      center,
      center,
      outerRadius,
      startAngle
    );

  const outerEnd =
    polarToCartesian(
      center,
      center,
      outerRadius,
      endAngle
    );

  const innerEnd =
    polarToCartesian(
      center,
      center,
      innerRadius,
      endAngle
    );

  const innerStart =
    polarToCartesian(
      center,
      center,
      innerRadius,
      startAngle
    );

  const largeArcFlag =
    endAngle - startAngle > 180
      ? 1
      : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,

    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,

    `L ${innerEnd.x} ${innerEnd.y}`,

    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,

    "Z",
  ].join(" ");
}

export function getMonthMarkers(
  days
) {
  const markers = [];

  days.forEach((day) => {
    const currentMonth =
      day.date.getMonth();

    const previousDay =
      days[day.index - 1];

    const previousMonth =
      previousDay?.date.getMonth();

    if (
      day.index === 0 ||
      currentMonth !==
        previousMonth
    ) {
      markers.push({
        month:
          day.date.toLocaleString(
            "en-US",
            {
              month: "short",
            }
          ),
        dayIndex: day.index,
      });
    }
  });

  return markers;
}

export function getDayStorageKey(
  dayNumber
) {
  return `day-${dayNumber}`;
}