import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Plus, Trash2 } from "lucide-react";
import {
  loadJourneyConfig,
  parseStoredDate,
} from "../../components/heatmap/heatmapUtils";

const STORAGE_KEY = "productivity-116-tomorrow-plan-v2";

function getJourneyDate(dayNumber, config) {
  const startDate = parseStoredDate(config?.startDate);
  const date = startDate ? new Date(startDate) : new Date();

  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + (dayNumber - 1));

  return date;
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function loadPlans() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return {};
    }

    const parsed = JSON.parse(saved);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

function normalizePriority(priority) {
  if (!priority || typeof priority !== "object") {
    return null;
  }

  const text =
    typeof priority.text === "string"
      ? priority.text.trim()
      : "";

  if (!text) {
    return null;
  }

  return {
    id:
      typeof priority.id === "string" && priority.id
        ? priority.id
        : `${Date.now()}-${Math.random()}`,
    text,
    completed: priority.completed === true,
  };
}

function normalizePlans(plans) {
  if (!plans || typeof plans !== "object" || Array.isArray(plans)) {
    return {};
  }

  const normalized = {};

  Object.entries(plans).forEach(([day, priorities]) => {
    if (!Array.isArray(priorities)) {
      return;
    }

    const validPriorities = priorities
      .map(normalizePriority)
      .filter(Boolean);

    if (validPriorities.length > 0) {
      normalized[day] = validPriorities;
    }
  });

  return normalized;
}

function TomorrowPlan({ selectedDay }) {
  const [plans, setPlans] = useState(() => normalizePlans(loadPlans()));
  const [text, setText] = useState("");
  const [journeyConfig, setJourneyConfig] = useState(loadJourneyConfig);

  const journeyDay = Math.max(1, Number(selectedDay) || 1);

  const planDate = useMemo(
    () => getJourneyDate(journeyDay, journeyConfig),
    [journeyDay, journeyConfig]
  );

  const priorities = plans[journeyDay] || [];

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    } catch {
      // Ignore storage errors.
    }
  }, [plans]);

  useEffect(() => {
    function handleJourneyConfigUpdate() {
      setJourneyConfig(loadJourneyConfig());
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

  function addPriority() {
    const cleanText = text.trim();

    if (!cleanText) {
      return;
    }

    const priority = {
      id: `${Date.now()}-${Math.random()}`,
      text: cleanText,
      completed: false,
    };

    setPlans((previous) => ({
      ...previous,
      [journeyDay]: [
        ...(previous[journeyDay] || []),
        priority,
      ],
    }));

    setText("");
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      addPriority();
    }
  }

  function togglePriority(priorityId) {
    setPlans((previous) => ({
      ...previous,
      [journeyDay]: (previous[journeyDay] || []).map((priority) =>
        priority.id === priorityId
          ? {
              ...priority,
              completed: !priority.completed,
            }
          : priority
      ),
    }));
  }

  function removePriority(priorityId) {
    setPlans((previous) => ({
      ...previous,
      [journeyDay]: (previous[journeyDay] || []).filter(
        (priority) => priority.id !== priorityId
      ),
    }));
  }

  return (
    <section className="tomorrow-plan">
      <div className="tomorrow-plan-header">
        <div className="tomorrow-title-group">
          <div className="tomorrow-icon">
            <CalendarDays size={17} strokeWidth={1.6} />
          </div>

          <div>
            <span className="eyebrow">PLAN AHEAD</span>
            <h3>Today's Plan</h3>
          </div>
        </div>

        <div className="tomorrow-date">
          <strong>{formatDate(planDate)}</strong>
          <span>Day {journeyDay}</span>
        </div>
      </div>

      <div className="tomorrow-input-row">
        <input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a priority for today..."
          aria-label="Add a priority for today"
        />

        <button
          type="button"
          className="tomorrow-add-button"
          onClick={addPriority}
          disabled={!text.trim()}
          aria-label="Add priority"
        >
          <Plus size={14} strokeWidth={1.8} />
          Add
        </button>
      </div>

      {priorities.length > 0 ? (
        <div className="tomorrow-priorities">
          {priorities.map((priority, index) => (
            <div
              key={priority.id}
              className={`tomorrow-priority${
                priority.completed ? " completed" : ""
              }`}
            >
              <button
                type="button"
                className="priority-check"
                onClick={() => togglePriority(priority.id)}
                aria-label={
                  priority.completed
                    ? `Mark priority ${index + 1} incomplete`
                    : `Complete priority ${index + 1}`
                }
              >
                {priority.completed ? (
                  <Check size={13} strokeWidth={2} />
                ) : null}
              </button>

              <span className="priority-number">
                {String(index + 1).padStart(2, "0")}
              </span>

              <span className="priority-text">
                {priority.text}
              </span>

              <button
                type="button"
                className="priority-delete"
                onClick={() => removePriority(priority.id)}
                aria-label={`Delete priority ${index + 1}`}
              >
                <Trash2 size={14} strokeWidth={1.6} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="tomorrow-empty">
          <div className="tomorrow-empty-icon">
            <Check size={15} strokeWidth={1.7} />
          </div>
          <span>No priorities added yet.</span>
          <small>Set a few clear priorities for today.</small>
        </div>
      )}

      <div className="tomorrow-plan-footer">
        <span>
          {priorities.length} {priorities.length === 1 ? "priority" : "priorities"}
        </span>

        <span>
          {priorities.filter((priority) => priority.completed).length} completed
        </span>
      </div>
    </section>
  );
}

export default TomorrowPlan;
