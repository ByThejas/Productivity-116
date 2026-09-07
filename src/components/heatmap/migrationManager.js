const MIGRATION_STATE_STORAGE_KEY =
  "productivity-migration-state-v1";

export const CURRENT_MIGRATION_VERSION = 4;

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

function parseStoredValue(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function createInitialMigrationState() {
  return {
    version: 0,
    completedVersions: [],
    lastMigrationAt: null,
    lastMigrationResult: null,
  };
}

export function readMigrationState() {
  const stored = readStorageItem(
    MIGRATION_STATE_STORAGE_KEY
  );

  const parsed = parseStoredValue(stored);

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    return createInitialMigrationState();
  }

  const version = Number(parsed.version);

  const completedVersions =
    Array.isArray(parsed.completedVersions)
      ? parsed.completedVersions
          .map(Number)
          .filter(
            (item) =>
              Number.isInteger(item) &&
              item >= 1
          )
      : [];

  return {
    version:
      Number.isInteger(version) && version >= 0
        ? version
        : 0,

    completedVersions: [
      ...new Set(completedVersions),
    ].sort((a, b) => a - b),

    lastMigrationAt:
      typeof parsed.lastMigrationAt ===
      "string"
        ? parsed.lastMigrationAt
        : null,

    lastMigrationResult:
      typeof parsed.lastMigrationResult ===
      "string"
        ? parsed.lastMigrationResult
        : null,
  };
}

export function saveMigrationState(state) {
  if (
    !state ||
    typeof state !== "object" ||
    Array.isArray(state)
  ) {
    return false;
  }

  return writeStorageItem(
    MIGRATION_STATE_STORAGE_KEY,
    JSON.stringify(state)
  );
}

export function getMigrationVersion() {
  return readMigrationState().version;
}

export function isMigrationVersionComplete(
  version
) {
  const safeVersion = Number(version);

  if (
    !Number.isInteger(safeVersion) ||
    safeVersion < 1
  ) {
    return false;
  }

  return readMigrationState()
    .completedVersions.includes(
      safeVersion
    );
}

export function createMigrationRegistry() {
  return new Map();
}

export function registerMigration(
  registry,
  version,
  migration
) {
  if (!(registry instanceof Map)) {
    return false;
  }

  const safeVersion = Number(version);

  if (
    !Number.isInteger(safeVersion) ||
    safeVersion < 1
  ) {
    return false;
  }

  if (
    !migration ||
    typeof migration !== "object" ||
    Array.isArray(migration)
  ) {
    return false;
  }

  if (
    typeof migration.run !== "function"
  ) {
    return false;
  }

  if (
    migration.validate !== undefined &&
    typeof migration.validate !==
      "function"
  ) {
    return false;
  }

  registry.set(safeVersion, {
    version: safeVersion,

    name:
      typeof migration.name ===
      "string"
        ? migration.name
        : `Migration ${safeVersion}`,

    run: migration.run,

    validate:
      migration.validate || null,
  });

  return true;
}

export function getRegisteredMigrations(
  registry
) {
  if (!(registry instanceof Map)) {
    return [];
  }

  return Array.from(
    registry.values()
  ).sort(
    (a, b) =>
      a.version - b.version
  );
}

export function getPendingMigrations(
  registry,
  currentVersion =
    getMigrationVersion()
) {
  const safeVersion = Number(
    currentVersion
  );

  if (
    !Number.isInteger(safeVersion) ||
    safeVersion < 0
  ) {
    return [];
  }

  return getRegisteredMigrations(
    registry
  ).filter(
    (migration) =>
      migration.version >
      safeVersion
  );
}

export function validateMigrationResult(
  migration,
  result
) {
  if (
    !migration ||
    typeof migration !== "object"
  ) {
    return false;
  }

  if (
    typeof migration.validate ===
    "function"
  ) {
    try {
      return Boolean(
        migration.validate(result)
      );
    } catch {
      return false;
    }
  }

  return (
    result !== null &&
    result !== undefined
  );
}

export function runMigrations(
  registry,
  initialData,
  options = {}
) {
  const {
    currentVersion =
      getMigrationVersion(),

    targetVersion =
      CURRENT_MIGRATION_VERSION,

    dryRun = true,
  } = options;

  const startingVersion =
    Number(currentVersion);

  const requestedTarget =
    Number(targetVersion);

  if (
    !Number.isInteger(
      startingVersion
    ) ||
    startingVersion < 0
  ) {
    return {
      ok: false,
      data: initialData,
      version: 0,
      migrated: false,
      dryRun,
      error:
        "Invalid current migration version.",
    };
  }

  if (
    !Number.isInteger(
      requestedTarget
    ) ||
    requestedTarget < startingVersion
  ) {
    return {
      ok: false,
      data: initialData,
      version: startingVersion,
      migrated: false,
      dryRun,
      error:
        "Invalid target migration version.",
    };
  }

  const migrations =
    getRegisteredMigrations(
      registry
    ).filter(
      (migration) =>
        migration.version >
          startingVersion &&
        migration.version <=
          requestedTarget
    );

  let data = initialData;
  let version = startingVersion;

  const appliedMigrations = [];

  for (const migration of migrations) {
    try {
      const nextData =
        migration.run(data);

      if (
        !validateMigrationResult(
          migration,
          nextData
        )
      ) {
        return {
          ok: false,
          data: initialData,
          version: startingVersion,
          migrated: false,
          dryRun,
          appliedMigrations,
          error:
            `Migration ${migration.version} failed validation.`,
        };
      }

      data = nextData;
      version = migration.version;

      appliedMigrations.push(
        migration.version
      );
    } catch {
      return {
        ok: false,
        data: initialData,
        version: startingVersion,
        migrated: false,
        dryRun,
        appliedMigrations,
        error:
          `Migration ${migration.version} failed.`,
      };
    }
  }

  if (
    !dryRun &&
    appliedMigrations.length > 0
  ) {
    const previousState =
      readMigrationState();

    const completedVersions = [
      ...previousState.completedVersions,
      ...appliedMigrations,
    ];

    saveMigrationState({
      version,
      completedVersions: [
        ...new Set(
          completedVersions
        ),
      ].sort(
        (a, b) => a - b
      ),
      lastMigrationAt:
        new Date().toISOString(),
      lastMigrationResult:
        "success",
    });
  }

  return {
    ok: true,
    data,
    version,
    migrated:
      appliedMigrations.length > 0,
    dryRun,
    appliedMigrations,
    error: null,
  };
}

export function createMigration(
  version,
  name,
  run,
  validate
) {
  return {
    version,
    name,
    run,
    validate,
  };
}