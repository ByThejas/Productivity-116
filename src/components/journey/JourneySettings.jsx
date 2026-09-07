import {
  ArrowLeft,
  CalendarDays,
  Check,
  Monitor,
  Moon,
  Plus,
  Sun,
  Target,
  Trash2,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";

import PageContainer from "../layout/PageContainer";
import GlassCard from "../ui/GlassCard";
import RecoveryPanel from "../ui/RecoveryPanel";

import {
  calculateJourneyDuration,
  createCommitmentId,
  getJourneyCommitments,
  loadJourneyConfig,
  saveJourneyConfig,
} from "../heatmap/heatmapUtils";

const MAX_COMMITMENTS = 8;
const THEME_STORAGE_KEY = "productivity-theme-v1";

function getStoredTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);

    if (
      saved === "light" ||
      saved === "dark" ||
      saved === "system"
    ) {
      return saved;
    }
  } catch {
    // Ignore storage errors.
  }

  return "dark";
}

function applyTheme(theme) {
  const root = document.documentElement;

  if (theme === "system") {
    const prefersLight = window.matchMedia(
      "(prefers-color-scheme: light)"
    ).matches;

    root.dataset.theme = prefersLight ? "light" : "dark";
    return;
  }

  root.dataset.theme = theme;
}

function JourneySettings({ onClose, onComplete }) {
  const initialConfig = loadJourneyConfig();

  const [theme, setTheme] = useState(getStoredTheme);

  const [primaryGoal, setPrimaryGoal] = useState(
    initialConfig.primaryGoal || ""
  );

  const [startDate, setStartDate] = useState(
    initialConfig.startDate
  );

  const [endDate, setEndDate] = useState(
    initialConfig.endDate
  );

  const [commitments, setCommitments] = useState(
    getJourneyCommitments(initialConfig).map((commitment) => ({
      ...commitment,
    }))
  );

  const [newCommitment, setNewCommitment] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    applyTheme(theme);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors.
    }
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(
      "(prefers-color-scheme: light)"
    );

    function handleSystemThemeChange() {
      applyTheme("system");
    }

    mediaQuery.addEventListener(
      "change",
      handleSystemThemeChange
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        handleSystemThemeChange
      );
    };
  }, [theme]);

  const duration = useMemo(() => {
    if (!startDate || !endDate) {
      return 0;
    }

    return calculateJourneyDuration(
      new Date(`${startDate}T00:00:00`),
      new Date(`${endDate}T00:00:00`)
    );
  }, [startDate, endDate]);

  function updateCommitment(id, value) {
    setCommitments((previous) =>
      previous.map((commitment) =>
        commitment.id === id
          ? {
              ...commitment,
              label: value,
            }
          : commitment
      )
    );

    setError("");
  }

  function removeCommitment(id) {
    setCommitments((previous) =>
      previous.filter(
        (commitment) => commitment.id !== id
      )
    );

    setError("");
  }

  function addCommitment() {
    const label = newCommitment.trim();

    if (!label) {
      return;
    }

    if (commitments.length >= MAX_COMMITMENTS) {
      setError(
        `You can have up to ${MAX_COMMITMENTS} commitments.`
      );
      return;
    }

    const duplicate = commitments.some(
      (commitment) =>
        commitment.label.trim().toLowerCase() ===
        label.toLowerCase()
    );

    if (duplicate) {
      setError("That commitment already exists.");
      return;
    }

    setCommitments((previous) => [
      ...previous,
      {
        id: createCommitmentId(),
        label,
      },
    ]);

    setNewCommitment("");
    setError("");
  }

  function handleSubmit(event) {
    event.preventDefault();

    const goal = primaryGoal.trim();

    const cleanedCommitments = commitments
      .map((commitment) => ({
        id: commitment.id,
        label: commitment.label.trim(),
      }))
      .filter((commitment) => commitment.label);

    if (!goal) {
      setError("Give your journey a primary goal.");
      return;
    }

    if (!startDate || !endDate) {
      setError("Choose a start and end date.");
      return;
    }

    if (
      new Date(`${endDate}T00:00:00`) <
      new Date(`${startDate}T00:00:00`)
    ) {
      setError(
        "The end date must be on or after the start date."
      );
      return;
    }

    if (cleanedCommitments.length === 0) {
      setError("Add at least one daily commitment.");
      return;
    }

    const saved = saveJourneyConfig({
      primaryGoal: goal,
      startDate,
      endDate,
      commitments: cleanedCommitments,
    });

    if (!saved) {
      setError(
        "Unable to save your journey. Please try again."
      );
      return;
    }

    if (typeof onComplete === "function") {
      onComplete();
    }
  }

  return (
    <PageContainer>
      <section className="journey-setup-page">
        <div className="journey-setup-shell">
          <button
            type="button"
            className="journey-setup-back"
            onClick={onClose}
          >
            <ArrowLeft size={16} />
            Back to journey
          </button>

          <div className="journey-setup-heading">
            <span className="eyebrow">
              Journey settings
            </span>

            <h1>Shape your journey.</h1>

            <p>
              Change the outcome, dates, and daily commitments
              that define your spiral.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Primary Goal */}

            <GlassCard className="journey-setup-card">
              <div className="journey-setup-section-heading">
                <div className="journey-setup-section-icon">
                  <Target size={18} />
                </div>

                <div>
                  <span className="eyebrow">
                    Primary Goal
                  </span>

                  <h2>What are you building?</h2>
                </div>
              </div>

              <label className="journey-field">
                <span>Goal</span>

                <input
                  type="text"
                  value={primaryGoal}
                  onChange={(event) => {
                    setPrimaryGoal(event.target.value);
                    setError("");
                  }}
                  placeholder="e.g. Become physically and mentally stronger"
                  maxLength={120}
                />
              </label>
            </GlassCard>

            {/* Journey Range */}

            <GlassCard className="journey-setup-card">
              <div className="journey-setup-section-heading">
                <div className="journey-setup-section-icon">
                  <CalendarDays size={18} />
                </div>

                <div>
                  <span className="eyebrow">
                    Journey Range
                  </span>

                  <h2>Choose your timeline.</h2>
                </div>
              </div>

              <div className="journey-date-grid">
                <label className="journey-field">
                  <span>Start date</span>

                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => {
                      setStartDate(event.target.value);
                      setError("");
                    }}
                  />
                </label>

                <label className="journey-field">
                  <span>End date</span>

                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(event) => {
                      setEndDate(event.target.value);
                      setError("");
                    }}
                  />
                </label>
              </div>

              <div className="journey-duration-card">
                <span className="eyebrow">
                  Duration
                </span>

                <strong>
                  {duration > 0
                    ? `${duration} days`
                    : "—"}
                </strong>

                <span>
                  Your spiral will contain one day segment
                  for every day in this range.
                </span>
              </div>
            </GlassCard>

            {/* Daily Commitments */}

            <GlassCard className="journey-setup-card">
              <div className="journey-setup-section-heading">
                <div className="journey-setup-section-icon">
                  <Check size={18} />
                </div>

                <div>
                  <span className="eyebrow">
                    Daily Commitments
                  </span>

                  <h2>What will you repeat?</h2>
                </div>
              </div>

              <p className="journey-settings-helper">
                These are the daily actions that contribute
                to your primary goal. Your spiral will use
                these commitments to calculate each day’s
                completion.
              </p>

              <div className="journey-commitments-builder">
                {commitments.map(
                  (commitment, index) => (
                    <div
                      className="journey-commitment-row"
                      key={commitment.id}
                    >
                      <span className="journey-commitment-index">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <input
                        type="text"
                        value={commitment.label}
                        onChange={(event) =>
                          updateCommitment(
                            commitment.id,
                            event.target.value
                          )
                        }
                        maxLength={80}
                        aria-label={`Commitment ${
                          index + 1
                        }`}
                      />

                      <button
                        type="button"
                        className="journey-commitment-delete"
                        onClick={() =>
                          removeCommitment(
                            commitment.id
                          )
                        }
                        aria-label={`Remove ${commitment.label}`}
                        title="Remove commitment"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )
                )}

                <div className="journey-commitment-add">
                  <input
                    type="text"
                    value={newCommitment}
                    onChange={(event) => {
                      setNewCommitment(
                        event.target.value
                      );
                      setError("");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addCommitment();
                      }
                    }}
                    placeholder="Add another commitment"
                    maxLength={80}
                    aria-label="New commitment"
                  />

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={addCommitment}
                    disabled={
                      commitments.length >=
                      MAX_COMMITMENTS
                    }
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>
              </div>

              <div className="journey-settings-limit">
                {commitments.length}/
                {MAX_COMMITMENTS} commitments
              </div>
            </GlassCard>

            {/* Appearance */}

            <GlassCard
              className="journey-setup-card journey-appearance-card"
            >
              <div className="journey-setup-section-heading">
                <div className="journey-setup-section-icon">
                  <Sun size={18} />
                </div>

                <div>
                  <span className="eyebrow">
                    Appearance
                  </span>

                  <h2>Choose your theme.</h2>
                </div>
              </div>

              <p className="journey-settings-helper">
                Choose how the app looks. Your preference
                is saved automatically.
              </p>

              <div
                className="journey-theme-options"
                role="radiogroup"
                aria-label="Theme"
              >
                {/* Dark */}

                <button
                  type="button"
                  className={`journey-theme-option ${
                    theme === "dark"
                      ? "is-active"
                      : ""
                  }`}
                  onClick={() => setTheme("dark")}
                  role="radio"
                  aria-checked={theme === "dark"}
                >
                  <Moon size={16} />

                  <span>
                    <strong>Dark</strong>
                    <small>
                      Current app theme
                    </small>
                  </span>
                </button>

                {/* Light */}

                <button
                  type="button"
                  className={`journey-theme-option ${
                    theme === "light"
                      ? "is-active"
                      : ""
                  }`}
                  onClick={() => setTheme("light")}
                  role="radio"
                  aria-checked={theme === "light"}
                >
                  <Sun size={16} />

                  <span>
                    <strong>Light</strong>
                    <small>
                      Bright and clean
                    </small>
                  </span>
                </button>

                {/* System */}

                <button
                  type="button"
                  className={`journey-theme-option ${
                    theme === "system"
                      ? "is-active"
                      : ""
                  }`}
                  onClick={() => setTheme("system")}
                  role="radio"
                  aria-checked={theme === "system"}
                >
                  <Monitor size={16} />

                  <span>
                    <strong>System</strong>
                    <small>
                      Follow device theme
                    </small>
                  </span>
                </button>
              </div>
            </GlassCard>

            {/* Error */}

            {error && (
              <p
                className="journey-setup-error"
                role="alert"
              >
                {error}
              </p>
            )}

            {/* Actions */}

            <div className="journey-settings-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={onClose}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
              >
                <Check size={16} />
                Save Journey
              </button>
            </div>
          </form>

          {/* Data Recovery */}

          <RecoveryPanel />
        </div>
      </section>
    </PageContainer>
  );
}

export default JourneySettings;