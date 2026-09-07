import {
  useEffect,
  useState,
} from "react";

import {
  Droplets,
  Minus,
  Plus,
} from "lucide-react";

const WATER_STORAGE_KEY =
  "productivity-116-water-v1";

const STEP = 500;

function createInitialWaterState() {
  try {
    const saved =
      localStorage.getItem(
        WATER_STORAGE_KEY
      );

    if (!saved) {
      return {};
    }

    const parsed =
      JSON.parse(saved);

    if (
      !parsed ||
      typeof parsed !== "object"
    ) {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

function WaterTracker({
  selectedDay,
}) {
  const [waterState, setWaterState] =
    useState(
      createInitialWaterState
    );

  const journeyDay =
    selectedDay || 1;

  const currentAmount =
    Number(
      waterState[journeyDay] || 0
    );

  const waterLitres =
    (currentAmount / 1000)
      .toFixed(1);

  /*
    Save hydration progress.
  */
  useEffect(() => {
    try {
      localStorage.setItem(
        WATER_STORAGE_KEY,
        JSON.stringify(waterState)
      );
    } catch {
      // Ignore storage errors.
    }
  }, [waterState]);

  function updateWater(amount) {
    setWaterState((previous) => {
      const current =
        Number(
          previous[journeyDay] || 0
        );

      const next =
        Math.max(
          current + amount,
          0
        );

      return {
        ...previous,
        [journeyDay]: next,
      };
    });
  }

  function addWater() {
    updateWater(STEP);
  }

  function removeWater() {
    updateWater(-STEP);
  }

  return (
    <section className="water-tracker">

      {/* =====================================
          HEADER
      ===================================== */}

      <div className="water-header">

        <div className="water-title-group">

          <div className="water-icon">
            <Droplets
              size={17}
              strokeWidth={1.7}
            />
          </div>

          <div>
            <span className="eyebrow">
              Day {journeyDay} hydration
            </span>

            <h3>
              Water
            </h3>
          </div>

        </div>

      </div>

      {/* =====================================
          MAIN AMOUNT
      ===================================== */}

      <div className="water-progress-area">

        <div className="water-amount">

          <strong>
            {waterLitres}
          </strong>

          <span>
            L
          </span>

        </div>

      </div>

      {/* =====================================
          CONTROLS
      ===================================== */}

      <div className="water-controls">

        <button
          type="button"
          className="water-adjust-button"
          onClick={removeWater}
          disabled={
            currentAmount === 0
          }
          aria-label="Remove 500 millilitres"
        >
          <Minus size={15} />

          <span>
            500 ml
          </span>
        </button>

        <span className="water-step-label">
          Each step
        </span>

        <button
          type="button"
          className="water-adjust-button"
          onClick={addWater}
          aria-label="Add 500 millilitres"
        >
          <span>
            500 ml
          </span>

          <Plus size={15} />
        </button>

      </div>

      {/* =====================================
          STATUS
      ===================================== */}

      <div className="water-status">
        {currentAmount === 0
          ? "No water logged yet"
          : `${currentAmount} ml logged today`}
      </div>

    </section>
  );
}

export default WaterTracker;