const RECOVERY_HISTORY_STORAGE_KEY =
  "productivity-recovery-history-v1";

export const RECOVERY_EVENT_NAME =
  "productivity-storage-recovered";

/*
 * Safe JSON comparison.
 */
function valuesAreEqual(first, second) {
  try {
    return JSON.stringify(first) === JSON.stringify(second);
  } catch {
    return false;
  }
}

/*
 * Read raw localStorage data without throwing.
 */
export function readRawStorage(storageKey) {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

/*
 * Parse JSON safely.
 */
export function parseStorageValue(serialized) {
  if (!serialized) {
    return null;
  }

  try {
    return JSON.parse(serialized);
  } catch {
    return null;
  }
}

/*
 * Basic object validator.
 */
export function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

/*
 * Basic array validator.
 */
export function isArray(value) {
  return Array.isArray(value);
}

/*
 * Dispatch a recovery event so the rest of the
 * application can react without being tightly coupled
 * to the recovery implementation.
 */
function dispatchRecoveryEvent(detail) {
  try {
    window.dispatchEvent(
      new CustomEvent(
        RECOVERY_EVENT_NAME,
        {
          detail,
        }
      )
    );
  } catch {
    // Recovery events are non-critical.
  }
}

/*
 * Keep a small recovery history.
 *
 * This is intentionally best-effort. If storage itself
 * is unavailable, recovery must still continue.
 */
function recordRecoveryEvent(event) {
  try {
    const existing =
      parseStorageValue(
        localStorage.getItem(
          RECOVERY_HISTORY_STORAGE_KEY
        )
      );

    const history = Array.isArray(existing)
      ? existing
      : [];

    const updated = [
      ...history.slice(-19),
      {
        ...event,
        recoveredAt:
          new Date().toISOString(),
      },
    ];

    localStorage.setItem(
      RECOVERY_HISTORY_STORAGE_KEY,
      JSON.stringify(updated)
    );
  } catch {
    // Never allow recovery logging to break recovery.
  }
}

/*
 * Record and broadcast a recovery action.
 */
function notifyRecovery(event) {
  recordRecoveryEvent(event);
  dispatchRecoveryEvent(event);
}

/*
 * Safely read a JSON-backed storage entry.
 *
 * Recovery order:
 *
 * 1. Valid primary
 * 2. Valid backup
 * 3. Safe fallback
 *
 * A corrupted primary is NEVER copied into the backup.
 */
export function safeReadJson({
  storageKey,
  backupStorageKey,
  validate,
  fallback,
  label = storageKey,
}) {
  const primaryRaw =
    readRawStorage(storageKey);

  const primaryValue =
    parseStorageValue(primaryRaw);

  /*
   * Primary data is healthy.
   */
  if (
    primaryValue !== null &&
    (!validate || validate(primaryValue))
  ) {
    return {
      value: primaryValue,
      source: "primary",
      recovered: false,
    };
  }

  /*
   * Primary data is missing or invalid.
   *
   * Try the backup before falling back.
   */
  const backupRaw =
    readRawStorage(
      backupStorageKey
    );

  const backupValue =
    parseStorageValue(backupRaw);

  if (
    backupValue !== null &&
    (!validate || validate(backupValue))
  ) {
    let restored = false;

    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(backupValue)
      );

      restored = true;
    } catch {
      // Primary restoration failed; backup remains intact.
    }

    notifyRecovery({
      storageKey,
      label,
      source:
        primaryRaw === null
          ? "backup"
          : "backup-after-invalid-primary",
      restored,
    });

    return {
      value: backupValue,
      source: "backup",
      recovered: true,
      restored,
    };
  }

  /*
   * No usable primary or backup exists.
   *
   * Use the supplied safe fallback.
   */
  const fallbackValue =
    typeof fallback === "function"
      ? fallback()
      : fallback;

  notifyRecovery({
    storageKey,
    label,
    source: "fallback",
    restored: false,
  });

  return {
    value: fallbackValue,
    source: "fallback",
    recovered: true,
    restored: false,
  };
}

/*
 * Safely write JSON data.
 *
 * Before replacing healthy primary data, rotate the
 * previous primary value into the backup.
 *
 * Important:
 * A malformed existing primary is NOT promoted to
 * the backup, because doing so could destroy a healthy
 * backup.
 */
export function safeWriteJson({
  storageKey,
  backupStorageKey,
  value,
  validateExisting,
}) {
  let serialized;

  try {
    serialized = JSON.stringify(value);
  } catch {
    return false;
  }

  if (!serialized) {
    return false;
  }

  const existingRaw =
    readRawStorage(storageKey);

  /*
   * Only rotate an existing value into the backup
   * when the existing value is known to be valid.
   */
  if (existingRaw) {
    const existingValue =
      parseStorageValue(existingRaw);

    const existingIsValid =
      existingValue !== null &&
      (!validateExisting ||
        validateExisting(existingValue));

    if (existingIsValid) {
      try {
        localStorage.setItem(
          backupStorageKey,
          existingRaw
        );
      } catch {
        /*
         * Do not abort the write merely because
         * backup rotation failed.
         */
      }
    }
  }

  try {
    localStorage.setItem(
      storageKey,
      serialized
    );

    return true;
  } catch {
    return false;
  }
}

/*
 * Repair a storage value after it has been normalized.
 *
 * This is useful when the primary value is syntactically
 * valid JSON but structurally malformed.
 *
 * The old primary is backed up only when it passes the
 * supplied validator.
 */
export function repairJsonStorage({
  storageKey,
  backupStorageKey,
  originalValue,
  repairedValue,
  validateOriginal,
}) {
  if (
    valuesAreEqual(
      originalValue,
      repairedValue
    )
  ) {
    return false;
  }

  return safeWriteJson({
    storageKey,
    backupStorageKey,
    value: repairedValue,
    validateExisting:
      validateOriginal,
  });
}

/*
 * Explicitly restore a known-good backup.
 *
 * This function does not delete the backup after
 * restoring it.
 */
export function restoreJsonBackup({
  storageKey,
  backupStorageKey,
  validate,
  label = storageKey,
}) {
  const backupRaw =
    readRawStorage(
      backupStorageKey
    );

  const backupValue =
    parseStorageValue(backupRaw);

  if (
    backupValue === null ||
    (validate && !validate(backupValue))
  ) {
    return {
      restored: false,
      value: null,
    };
  }

  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify(backupValue)
    );
  } catch {
    return {
      restored: false,
      value: null,
    };
  }

  notifyRecovery({
    storageKey,
    label,
    source: "explicit-backup-restore",
    restored: true,
  });

  return {
    restored: true,
    value: backupValue,
  };
}

/*
 * Read recovery history.
 *
 * Useful later for the Recovery UI in 10E.
 */
export function getRecoveryHistory() {
  try {
    const parsed =
      parseStorageValue(
        localStorage.getItem(
          RECOVERY_HISTORY_STORAGE_KEY
        )
      );

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

/*
 * Clear recovery history.
 *
 * Does not touch application data.
 */
export function clearRecoveryHistory() {
  try {
    localStorage.removeItem(
      RECOVERY_HISTORY_STORAGE_KEY
    );

    return true;
  } catch {
    return false;
  }
}