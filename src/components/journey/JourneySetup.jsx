import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import {
  DEFAULT_COMMITMENTS,
  DEFAULT_END_DATE,
  DEFAULT_START_DATE,
  calculateJourneyDuration,
  createCommitmentId,
  formatDateForStorage,
  saveJourneyConfig,
} from "../heatmap/heatmapUtils";

const MAX_COMMITMENTS = 8;

function JourneySetup({ onComplete }) {
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [startDate, setStartDate] = useState(
    formatDateForStorage(DEFAULT_START_DATE)
  );
  const [endDate, setEndDate] = useState(
    formatDateForStorage(DEFAULT_END_DATE)
  );
  const [commitments, setCommitments] = useState(
    DEFAULT_COMMITMENTS.map((commitment) => ({
      ...commitment,
    }))
  );
  const [newCommitment, setNewCommitment] = useState("");

  const duration = useMemo(() => {
    if (!startDate || !endDate) return 0;

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    return calculateJourneyDuration(start, end);
  }, [startDate, endDate]);

  const dateError = useMemo(() => {
    if (!startDate || !endDate) return "";

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    if (end < start) {
      return "End date must be after the start date.";
    }

    return "";
  }, [startDate, endDate]);

  const canCreateJourney =
    primaryGoal.trim().length > 0 &&
    Boolean(startDate) &&
    Boolean(endDate) &&
    !dateError &&
    duration > 0 &&
    commitments.length > 0;

  function updateCommitment(commitmentId, label) {
    setCommitments((previous) =>
      previous.map((commitment) =>
        commitment.id === commitmentId
          ? {
              ...commitment,
              label,
            }
          : commitment
      )
    );
  }

  function removeCommitment(commitmentId) {
    setCommitments((previous) =>
      previous.filter(
        (commitment) =>
          commitment.id !== commitmentId
      )
    );
  }

  function addCommitment() {
    const label = newCommitment.trim();

    if (!label) return;

    if (commitments.length >= MAX_COMMITMENTS) {
      return;
    }

    const duplicate = commitments.some(
      (commitment) =>
        commitment.label.toLowerCase() ===
        label.toLowerCase()
    );

    if (duplicate) {
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
  }

  function handleNewCommitmentKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      addCommitment();
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    const cleanedCommitments = commitments
      .map((commitment) => ({
        ...commitment,
        label: commitment.label.trim(),
      }))
      .filter(
        (commitment) => commitment.label.length > 0
      );

    if (
      !canCreateJourney ||
      cleanedCommitments.length === 0
    ) {
      return;
    }

    const saved = saveJourneyConfig({
      primaryGoal: primaryGoal.trim(),
      startDate,
      endDate,
      commitments: cleanedCommitments,
    });

    if (!saved) return;

    if (onComplete) {
      onComplete();
    }
  }

  return (
    <main className="journey-setup-page">
      <section className="journey-setup">
        <div className="journey-setup-intro">
          <div className="journey-setup-mark">
            <Target
              size={22}
              strokeWidth={1.5}
            />
          </div>

          <span className="eyebrow">
            Create your journey
          </span>

          <h1>
            Give yourself
            <br />
            something worth becoming.
          </h1>

          <p>
            Choose what you're working toward,
            define the period you want to commit
            to, and decide what you will do every
            day to move closer.
          </p>
        </div>

        <form
          className="journey-setup-form"
          onSubmit={handleSubmit}
        >
          <div className="journey-setup-field">
            <label htmlFor="primary-goal">
              Primary Goal
            </label>

            <div className="journey-setup-input-wrap">
              <Target
                size={17}
                strokeWidth={1.6}
              />

              <input
                id="primary-goal"
                type="text"
                value={primaryGoal}
                onChange={(event) =>
                  setPrimaryGoal(
                    event.target.value
                  )
                }
                placeholder="What do you want to achieve?"
                maxLength={100}
                autoComplete="off"
              />
            </div>

            <span className="journey-setup-hint">
              One clear outcome. Everything else
              will support it.
            </span>
          </div>

          <div className="journey-setup-date-grid">
            <div className="journey-setup-field">
              <label htmlFor="journey-start-date">
                Start Date
              </label>

              <div className="journey-setup-input-wrap">
                <CalendarDays
                  size={17}
                  strokeWidth={1.6}
                />

                <input
                  id="journey-start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) =>
                    setStartDate(
                      event.target.value
                    )
                  }
                />
              </div>
            </div>

            <div className="journey-setup-field">
              <label htmlFor="journey-end-date">
                End Date
              </label>

              <div className="journey-setup-input-wrap">
                <CalendarDays
                  size={17}
                  strokeWidth={1.6}
                />

                <input
                  id="journey-end-date"
                  type="date"
                  value={endDate}
                  onChange={(event) =>
                    setEndDate(
                      event.target.value
                    )
                  }
                />
              </div>
            </div>
          </div>

          {dateError && (
            <div className="journey-setup-error">
              {dateError}
            </div>
          )}

          <div className="journey-setup-duration">
            <div>
              <span className="eyebrow">
                Journey duration
              </span>

              <strong>
                {duration > 0 ? duration : "—"}
              </strong>

              <span>
                {duration === 1
                  ? "day"
                  : "days"}
              </span>
            </div>

            <div className="journey-setup-duration-icon">
              <CalendarDays
                size={18}
                strokeWidth={1.5}
              />
            </div>
          </div>

          <div className="journey-commitments-builder">
            <div className="journey-commitments-header">
              <div>
                <span className="eyebrow">
                  Daily commitments
                </span>

                <h2>
                  What will you do every day?
                </h2>

                <p>
                  These are the actions that will
                  shape your journey.
                </p>
              </div>

              <span className="journey-commitments-count">
                {commitments.length}/{MAX_COMMITMENTS}
              </span>
            </div>

            <div className="journey-commitments-list">
              {commitments.map(
                (commitment, index) => (
                  <div
                    className="journey-commitment-row"
                    key={commitment.id}
                  >
                    <span className="journey-commitment-number">
                      {String(index + 1).padStart(
                        2,
                        "0"
                      )}
                    </span>

                    <span className="journey-commitment-check">
                      <Check
                        size={13}
                        strokeWidth={2}
                      />
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
                      maxLength={60}
                      aria-label={`Commitment ${
                        index + 1
                      }`}
                    />

                    <button
                      type="button"
                      className="journey-commitment-remove"
                      onClick={() =>
                        removeCommitment(
                          commitment.id
                        )
                      }
                      aria-label={`Remove ${commitment.label}`}
                    >
                      <Trash2
                        size={14}
                        strokeWidth={1.6}
                      />
                    </button>
                  </div>
                )
              )}
            </div>

            <div className="journey-commitment-add">
              <div className="journey-commitment-add-input">
                <Plus
                  size={16}
                  strokeWidth={1.7}
                />

                <input
                  type="text"
                  value={newCommitment}
                  onChange={(event) =>
                    setNewCommitment(
                      event.target.value
                    )
                  }
                  onKeyDown={
                    handleNewCommitmentKeyDown
                  }
                  placeholder="Add another commitment..."
                  maxLength={60}
                  disabled={
                    commitments.length >=
                    MAX_COMMITMENTS
                  }
                />
              </div>

              <button
                type="button"
                className="journey-commitment-add-button"
                onClick={addCommitment}
                disabled={
                  !newCommitment.trim() ||
                  commitments.length >=
                    MAX_COMMITMENTS
                }
              >
                Add
              </button>
            </div>

            <span className="journey-setup-hint">
              You can edit or remove these later.
              Keep them simple enough to repeat.
            </span>
          </div>

          <button
            type="submit"
            className="journey-setup-submit"
            disabled={!canCreateJourney}
          >
            <span>Create My Journey</span>

            <ArrowRight
              size={17}
              strokeWidth={1.8}
            />
          </button>
        </form>

        <div className="journey-setup-footer">
          <span>
            Your journey is personal.
          </span>

          <span>
            You can change these settings later.
          </span>
        </div>
      </section>
    </main>
  );
}

export default JourneySetup;