# Productivity-116

Productivity-116 is a personal productivity and journey-tracking web application designed to help users stay consistent with their goals, daily commitments, focus sessions, hydration, planning, and long-term progress.

Instead of treating productivity as a collection of disconnected tasks, Productivity-116 represents progress as a personal journey. The application combines daily actions with a visual journey spiral, progress tracking, milestones, focus management, planning, and lightweight behavioral insights.

The application is built as a client-side React application with a premium dark-first glassmorphism interface and support for Dark, Light, and System themes.

## Overview

Productivity-116 is built around the idea that long-term progress becomes easier to understand when it is represented visually and broken down into daily commitments.

The application allows a user to:

- Define a primary goal
- Create a custom journey with a start and end date
- Define daily commitments that support the primary goal
- Track commitment completion for individual journey days
- Visualize progress through a dynamic journey spiral
- Track hydration independently
- Complete focused work sessions
- Plan upcoming activities
- Manage events through a daily timeline
- View journey progress and milestones
- Receive journey transition and completion feedback
- Switch between Dark, Light, and System themes
- Preserve data locally across sessions
- Recover from certain forms of corrupted local storage
- Maintain migration compatibility as the application evolves

The application does not require a backend for its core functionality. User data is stored locally in the browser using localStorage.

---

# Core Concept

The central concept of Productivity-116 is the Journey.

A journey consists of:

1. A primary goal
2. A start date
3. An end date
4. A set of daily commitments
5. Daily completion states
6. Supporting productivity data

The journey is visualized through a spiral-based progress system where each segment represents a day of the journey.

This creates a visual representation of consistency rather than simply displaying a list of tasks.

---

# Features

## 1. Custom Journey Setup

Users can create their own productivity journey instead of being restricted to a predefined duration.

Journey configuration includes:

- Primary goal
- Start date
- End date
- Automatically calculated journey duration
- Custom daily commitments

The application calculates the number of days between the selected dates and adapts the journey accordingly.

This allows journeys of different lengths to be created without relying on a fixed 116-day period.

---

## 2. Primary Goal

The Primary Goal represents the main outcome the user wants to achieve during the journey.

Examples include:

- Complete a personal project
- Prepare for an examination
- Improve physical fitness
- Build a portfolio
- Develop a professional skill
- Establish a consistent routine

The primary goal provides context for the daily commitments rather than functioning as another daily task.

---

## 3. Custom Daily Commitments

Users can create and manage their own daily commitments.

Commitments can be:

- Added
- Renamed
- Removed
- Associated with the journey

Each commitment represents an action that contributes toward the user's primary goal.

The system is designed around commitments rather than forcing users into a predefined habit list.

---

## 4. Journey Spiral

The Journey Spiral is the primary visual progress system.

Each segment represents a journey day and its state.

A day can have different completion states based on the user's commitments.

The spiral provides:

- Visual journey progression
- Daily completion representation
- Status-based segment coloring
- Journey day selection
- Progress visualization
- Month/date context
- Completion feedback

The visual system is designed to make long-term consistency easier to understand at a glance.

---

## 5. Daily Commitment Tracking

Daily commitments can be updated directly from the dashboard.

The application supports a simple state cycle that allows a commitment to move between:

- Pending
- Completed
- Not Completed

The selected state is stored locally and reflected throughout the application.

This allows the dashboard and journey visualization to remain synchronized.

---

## 6. Hydration Tracking

Productivity-116 includes an independent hydration tracker.

Users can:

- Add 500 ml
- Remove 500 ml
- View their current hydration amount

Hydration is intentionally separated from the primary journey commitment system.

This means hydration data does not automatically modify:

- Primary goal progress
- Daily commitment completion
- Journey completion
- Journey analytics

This separation keeps supporting wellness information independent from the core journey model.

---

## 7. Focus Timer

The Focus Timer provides a dedicated environment for focused work sessions.

Completed focus sessions record information such as:

- Session mode
- Duration
- Journey day
- Completion timestamp

Focus activity is reflected in relevant dashboard information.

The system also prevents duplicate completion handling for a single timer session.

---

## 8. Daily Timeline

The Daily Timeline provides a visual way to organize activities throughout the day.

Users can:

- Add events
- Define event names
- Set start times
- Set durations
- Mark events as completed
- Edit events
- Delete events
- View events relative to the current time

The timeline includes a current-time indicator to help users understand where they are within their daily schedule.

Timeline data is stored locally for each day.

---

## 9. Tomorrow's Plan

The planning system provides a space for preparing upcoming activities.

Plans are persisted locally so that they remain available between browser sessions.

The planning system is designed to complement the daily commitment and timeline systems rather than replacing them.

---

## 10. Journey Progress

The dashboard provides a high-level overview of journey progress.

Progress information includes concepts such as:

- Current journey day
- Total journey duration
- Overall journey percentage
- Remaining time
- Daily completion
- Commitment consistency
- Focus activity

The goal is to provide both immediate daily context and long-term journey context.

---

## 11. Milestones

Important points within the journey are surfaced through milestone information.

Milestones help users understand upcoming or completed stages of their journey and provide additional structure to a long-term goal.

---

## 12. Journey Day Transition

The application detects when the user moves into a new journey day.

The transition system can recognize a new day and provide appropriate feedback without requiring the user to manually reset the dashboard.

Journey day transition information is persisted locally.

---

## 13. Journey Completion

When the configured journey reaches its completion point, the application can recognize the completed journey and provide completion feedback.

Completion handling is protected against repeated recording so that the same journey completion event is not repeatedly stored.

---

## 14. Theme System

Productivity-116 supports three theme preferences:

- Dark
- Light
- System

Dark mode is the default.

System mode follows the operating system's preferred color scheme.

Theme preference is stored locally so the selected appearance can persist across sessions.

The interface is designed around a premium glassmorphism visual language with translucent surfaces, subtle borders, gradients, and depth.

---

## 15. Local Data Persistence

The application is designed to work without a backend.

Data is stored using browser localStorage.

Different application domains use separate storage keys for areas such as:

- Journey configuration
- Daily commitment state
- Hydration
- Focus sessions
- Daily timeline
- Tomorrow's plan
- Theme preference
- Journey transitions
- Journey completion
- Migration state
- Recovery history

This separation helps prevent one feature's data from unnecessarily affecting another feature.

---

# Data Safety and Recovery

Productivity-116 includes a storage recovery foundation designed to make local data handling safer.

The recovery system supports concepts such as:

- Safe JSON reading
- Validation of stored values
- Backup values
- Recovery from malformed JSON
- Safe fallback values
- Recovery event recording
- Recovery history
- Restoration of valid backups

When writing data, the application can preserve a previous valid value as a backup before replacing it.

This provides an additional layer of protection against corrupted local storage.

---

# Migration Architecture

The application contains a migration system to support future changes to the data structure.

The migration architecture allows stored data to evolve between application versions without requiring the application to blindly discard existing user information.

The migration system includes:

- Migration version tracking
- Migration registration
- Migration execution
- Validation
- Backup handling
- Journey configuration migration
- Daily state normalization
- Compatibility handling

The architecture is designed so that future changes to the application's data model can be introduced more safely.

---

# Application Architecture

The project follows a component-based React architecture.

```text
src/
├── components/
│   ├── heatmap/
│   │   ├── JourneyHeatmap.jsx
│   │   ├── heatmapUtils.js
│   │   ├── migrationManager.js
│   │   ├── stateIntegrity.js
│   │   └── recoveryManager.js
│   │
│   ├── habits/
│   │   ├── DailyHabits.jsx
│   │   ├── WaterTracker.jsx
│   │   ├── TomorrowPlan.jsx
│   │   ├── DailyTimeline.jsx
│   │   └── DailyTimeline.css
│   │
│   ├── focus/
│   │   └── FocusTimer.jsx
│   │
│   ├── journey/
│   │   ├── JourneySetup.jsx
│   │   └── JourneySettings.jsx
│   │
│   ├── layout/
│   │   ├── AppShell.jsx
│   │   ├── TopNavigation.jsx
│   │   └── PageContainer.jsx
│   │
│   └── ui/
│       └── GlassCard.jsx
│
├── pages/
│   └── Overview.jsx
│
├── App.jsx
├── main.jsx
└── index.css
