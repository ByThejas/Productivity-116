import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import {
  restoreJsonBackup,
  readRawStorage,
  parseStorageValue,
} from "../heatmap/recoveryManager";

const CONFIG_STORAGE_KEY =
  "productivity-journey-config-v1";

const CONFIG_BACKUP_KEY =
  "productivity-journey-config-backup-v1";

const STATE_STORAGE_KEY =
  "productivity-116-habits-v3";

const STATE_BACKUP_KEY =
  "productivity-116-habits-backup-v1";

function hasBackup(storageKey) {
  return Boolean(
    parseStorageValue(readRawStorage(storageKey))
  );
}

export default function RecoveryPanel() {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle");

  const configBackupAvailable =
    hasBackup(CONFIG_BACKUP_KEY);

  const stateBackupAvailable =
    hasBackup(STATE_BACKUP_KEY);

  function restoreConfig() {
    const result = restoreJsonBackup({
      storageKey: CONFIG_STORAGE_KEY,
      backupStorageKey: CONFIG_BACKUP_KEY,
      label: "Journey Configuration",
    });

    if (result.restored) {
      setStatus("success");
      setMessage(
        "Journey configuration restored successfully. Reload the app to apply it."
      );
    } else {
      setStatus("error");
      setMessage(
        "No valid Journey Configuration backup is available."
      );
    }
  }

  function restoreState() {
    const result = restoreJsonBackup({
      storageKey: STATE_STORAGE_KEY,
      backupStorageKey: STATE_BACKUP_KEY,
      label: "Daily Journey State",
    });

    if (result.restored) {
      setStatus("success");
      setMessage(
        "Daily journey state restored successfully. Reload the app to apply it."
      );
    } else {
      setStatus("error");
      setMessage(
        "No valid Daily Journey State backup is available."
      );
    }
  }

  return (
    <section
      className="widget-card"
      style={{
        marginTop: "24px",
        padding: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <ShieldCheck
          size={20}
          aria-hidden="true"
        />

        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "16px",
            }}
          >
            Data Recovery
          </h3>

          <p
            style={{
              margin: "5px 0 0",
              opacity: 0.6,
              fontSize: "13px",
            }}
          >
            Restore your journey from the latest safe
            backup if stored data becomes corrupted.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: "10px",
        }}
      >
        <button
          type="button"
          className="secondary-button"
          onClick={restoreConfig}
          disabled={!configBackupAvailable}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            width: "100%",
            opacity: configBackupAvailable ? 1 : 0.45,
          }}
        >
          <span>
            Restore Journey Configuration
          </span>

          <RotateCcw
            size={16}
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={restoreState}
          disabled={!stateBackupAvailable}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            width: "100%",
            opacity: stateBackupAvailable ? 1 : 0.45,
          }}
        >
          <span>
            Restore Daily Journey State
          </span>

          <RotateCcw
            size={16}
            aria-hidden="true"
          />
        </button>
      </div>

      {status !== "idle" && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
            marginTop: "14px",
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          {status === "success" ? (
            <CheckCircle2
              size={16}
              aria-hidden="true"
            />
          ) : (
            <AlertTriangle
              size={16}
              aria-hidden="true"
            />
          )}

          <span>{message}</span>
        </div>
      )}
    </section>
  );
}