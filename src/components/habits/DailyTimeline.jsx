import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Check, Clock3, Pencil, Trash2, X } from "lucide-react";
import "./DailyTimeline.css";

const STORAGE_KEY = "productivity-daily-timeline-v1";

const START_HOUR = 8;
const END_HOUR = 20;
const HOUR_COUNT = END_HOUR - START_HOUR;

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadEvents() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
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

function normalizeEvents(events) {
  if (!Array.isArray(events)) return [];

  return events
    .filter(
      (event) =>
        event &&
        typeof event === "object" &&
        typeof event.id === "string" &&
        typeof event.title === "string" &&
        /^\d{2}:\d{2}$/.test(event.time)
    )
    .map((event) => ({
      id: event.id,
      title: event.title.trim() || "Untitled event",
      time: event.time,
      duration: Math.max(
        15,
        Math.min(720, Number(event.duration) || 60)
      ),
      completed: Boolean(event.completed),
    }));
}

function formatTime(time) {
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function getMinutesFromStart(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours - START_HOUR) * 60 + minutes;
}

function getCurrentTimePosition() {
  const now = new Date();
  const minutes =
    (now.getHours() - START_HOUR) * 60 + now.getMinutes();

  if (minutes < 0 || minutes > HOUR_COUNT * 60) {
    return null;
  }

  return (minutes / (HOUR_COUNT * 60)) * 100;
}

function createEmptyForm() {
  return {
    id: null,
    title: "",
    time: "09:00",
    duration: "60",
  };
}

function DailyTimeline({ selectedDay, isCurrentDay = true }) {
  const [allEvents, setAllEvents] = useState(loadEvents);
  const [now, setNow] = useState(() => new Date());
  const [form, setForm] = useState(createEmptyForm);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const dateKey = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + ((selectedDay || 1) - 1));
    return getDateKey(date);
  }, [selectedDay]);

  const events = normalizeEvents(allEvents[dateKey] || []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allEvents));
    } catch {
      // Ignore storage errors.
    }
  }, [allEvents]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  function openAddEvent() {
    setForm(createEmptyForm());
    setIsModalOpen(true);
  }

  function openEditEvent(event) {
    setForm({
      id: event.id,
      title: event.title,
      time: event.time,
      duration: String(event.duration),
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setForm(createEmptyForm());
  }

  function saveEvent(event) {
    event.preventDefault();

    const title = form.title.trim();
    if (!title) return;

    const nextEvent = {
      id: form.id || `${Date.now()}-${Math.random()}`,
      title,
      time: form.time,
      duration: Math.max(
        15,
        Math.min(720, Number(form.duration) || 60)
      ),
      completed: form.id
        ? events.find((item) => item.id === form.id)?.completed || false
        : false,
    };

    setAllEvents((previous) => {
      const current = normalizeEvents(previous[dateKey] || []);
      const exists = current.some((item) => item.id === nextEvent.id);

      return {
        ...previous,
        [dateKey]: exists
          ? current.map((item) =>
              item.id === nextEvent.id ? nextEvent : item
            )
          : [...current, nextEvent],
      };
    });

    closeModal();
  }

  function toggleEvent(eventId) {
    setAllEvents((previous) => ({
      ...previous,
      [dateKey]: normalizeEvents(previous[dateKey] || []).map((event) =>
        event.id === eventId
          ? { ...event, completed: !event.completed }
          : event
      ),
    }));
  }

  function deleteEvent(eventId) {
    setAllEvents((previous) => ({
      ...previous,
      [dateKey]: normalizeEvents(previous[dateKey] || []).filter(
        (event) => event.id !== eventId
      ),
    }));
  }

  const currentTimePosition =
    isCurrentDay ? getCurrentTimePosition() : null;

  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeLabel = `${formatTime(
    `${String(currentHours).padStart(2, "0")}:${String(currentMinutes).padStart(2, "0")}`
  )}`;

  return (
    <>
      <section className="daily-timeline-widget">
        <div className="section-heading">
          <div>
            <div className="section-title-row">
              <span className="eyebrow">Daily Timeline</span>
              <span className="timeline-count">
                {events.length} {events.length === 1 ? "event" : "events"}{" "}
                {isCurrentDay ? "today" : `on Day ${selectedDay || 1}`}
              </span>
            </div>

            <h2>Your day at a glance</h2>
          </div>

          <button
            type="button"
            className="timeline-action"
            onClick={openAddEvent}
          >
            <CalendarPlus size={15} />
            Add an Event
          </button>
        </div>

        <div className="timeline">
          <div className="timeline-hours">
            {Array.from({ length: HOUR_COUNT + 1 }, (_, index) => (
              <span key={index}>
                {index === 0
                  ? "8 AM"
                  : index < 4
                    ? `${8 + index} AM`
                    : index === 4
                      ? "12 PM"
                      : `${index - 4} PM`}
              </span>
            ))}
          </div>

          <div className="timeline-body">
            <div className="timeline-grid-lines">
              {Array.from({ length: HOUR_COUNT + 1 }, (_, index) => (
                <span key={index} />
              ))}
            </div>

            {currentTimePosition !== null && (
              <div
                className="timeline-current-time"
                style={{ left: `${currentTimePosition}%` }}
                title={`Current time: ${currentTimeLabel}`}
              >
                <span />
              </div>
            )}

            {events.length === 0 ? (
              <div className="timeline-empty">
                <div className="empty-icon">
                  <Check size={16} strokeWidth={1.7} />
                </div>
                <span>Your schedule is clear.</span>
                <small>
                  Add an event to start planning your day.
                </small>
              </div>
            ) : (
              <div className="timeline-events">
                {events.map((event) => {
                  const startMinutes = getMinutesFromStart(event.time);
                  const left = Math.max(
                    0,
                    Math.min(
                      100,
                      (startMinutes / (HOUR_COUNT * 60)) * 100
                    )
                  );
                  const width = Math.max(
                    4,
                    Math.min(
                      100 - left,
                      (event.duration / (HOUR_COUNT * 60)) * 100
                    )
                  );

                  return (
                    <div
                      key={event.id}
                      className={`timeline-event ${
                        event.completed ? "completed" : ""
                      }`}
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                      }}
                    >
                      <button
                        type="button"
                        className="timeline-event-main"
                        onClick={() => toggleEvent(event.id)}
                        title={
                          event.completed
                            ? "Mark event incomplete"
                            : "Mark event complete"
                        }
                      >
                        <span className="timeline-event-check">
                          {event.completed && (
                            <Check size={11} strokeWidth={2.5} />
                          )}
                        </span>

                        <span className="timeline-event-copy">
                          <strong>{event.title}</strong>
                          <small>
                            {formatTime(event.time)} · {event.duration} min
                          </small>
                        </span>
                      </button>

                      <div className="timeline-event-actions">
                        <button
                          type="button"
                          onClick={() => openEditEvent(event)}
                          aria-label={`Edit ${event.title}`}
                          title="Edit event"
                        >
                          <Pencil size={12} />
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteEvent(event.id)}
                          aria-label={`Delete ${event.title}`}
                          title="Delete event"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {isModalOpen && (
        <div
          className="timeline-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <form className="timeline-modal" onSubmit={saveEvent}>
            <div className="timeline-modal-header">
              <div>
                <span className="eyebrow">
                  {form.id ? "Edit Event" : "New Event"}
                </span>
                <h3>Plan your time.</h3>
              </div>

              <button
                type="button"
                className="timeline-modal-close"
                onClick={closeModal}
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <label className="timeline-field">
              <span>Event</span>
              <input
                type="text"
                value={form.title}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    title: event.target.value,
                  }))
                }
                placeholder="e.g. Deep work, class, workout"
                maxLength={80}
                autoFocus
              />
            </label>

            <div className="timeline-field-grid">
              <label className="timeline-field">
                <span>Start time</span>
                <input
                  type="time"
                  min="08:00"
                  max="20:00"
                  value={form.time}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      time: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="timeline-field">
                <span>Duration</span>
                <select
                  value={form.duration}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      duration: event.target.value,
                    }))
                  }
                >
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                  <option value="180">3 hours</option>
                  <option value="240">4 hours</option>
                </select>
              </label>
            </div>

            <div className="timeline-modal-footer">
              <span>
                <Clock3 size={13} />
                Saved automatically
              </span>

              <div>
                <button
                  type="button"
                  className="timeline-secondary-button"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="timeline-primary-button"
                >
                  {form.id ? "Save Changes" : "Add Event"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export default DailyTimeline;
