# Habit Tracker — Decision Log

Major decisions taken while building and refining the habit tracker.

## Run: 2026-10-12 — Refactor date handling, remove redundant loads, harden localStorage

### Decisions

1. **Single referenceDate through the call chain**
   - **Context:** Streak computation and status indicators were using `new Date()` in multiple places, causing subtle drift when the date changed mid-calculation or when tests needed deterministic behavior.
   - **Chosen:** Pass one `referenceDate` parameter down the call chain and derive all boundaries from it.
   - **Alternatives considered:** Keeping scattered `new Date()` calls; using a global date override for tests.
   - **Rationale:** Makes the streak engine testable and eliminates a class of off-by-one bugs around midnight / timezone edges.
   - **Consequences:** Slightly more function signatures to maintain, but far easier to reason about correctness.

2. **Remove redundant `load()` calls**
   - **Context:** Several UI interactions were calling `load()` repeatedly, re-reading localStorage each time.
   - **Chosen:** Centralize state in memory and persist explicitly after mutations; remove extra `load()` calls.
   - **Alternatives considered:** Keeping the defensive reloads; debouncing storage reads.
   - **Rationale:** Reduces I/O, avoids race conditions, and makes the data flow one-directional.
   - **Consequences:** Any direct localStorage manipulation outside the app must now be followed by a page reload to be picked up.

3. **Harden localStorage validation with shape checks and bounds**
   - **Context:** Raw localStorage data could be corrupted, outdated, or injected by older versions of the app.
   - **Chosen:** Validate stored objects for correct shape, bound numeric values, and sanitize strings before trusting them.
   - **Alternatives considered:** Trusting stored data; blowing away storage on any mismatch.
   - **Rationale:** Prevents crashes from malformed data while preserving user data when possible.
   - **Consequences:** Adds a small validation layer; corrupt-but-recoverable data is repaired instead of deleted.

## Run: 2026-10-13 — Implement Task 3: Add a habit

### Decisions

1. **Removed the `ENABLE_ADD_HABIT` feature flag gating**
   - **Context:** Task 3 acceptance criteria require the add-habit form to be part of the core MVP experience, not opt-in via console flag.
   - **Chosen:** The form is now visible and functional by default. The `features.js` module remains in the repo for future flags but is no longer used for this feature.
   - **Alternatives considered:** Keeping the flag and enabling it by default in code; removing `features.js` entirely.
   - **Rationale:** A visible add-habit form is required for the end-to-end MVP flow. Keeping `features.js` avoids breaking any future flag-based experiments.
   - **Consequences:** Users can add habits immediately on first load.

2. **Added conditional deadline-day field for weekly habits**
   - **Context:** The spec requires `deadlineDay` for weekly habits (0–6, Sunday–Saturday) and `null` for daily habits.
   - **Chosen:** The form shows a "Deadline day" select only when frequency is "weekly". Daily habits implicitly store `deadlineDay: null`.
   - **Alternatives considered:** Always showing the field and defaulting to Sunday; using a text input instead of a select.
   - **Rationale:** Conditional display keeps the daily-habit form minimal while still honoring the data model.
   - **Consequences:** The UI must reset and re-evaluate field visibility on form submission.

3. **Default weekly `deadlineDay` to 0 (Sunday) and clamp out-of-range values**
   - **Context:** Storage validation rejects `deadlineDay` outside 0–6, and the existing default weekly habit uses Sunday.
   - **Chosen:** `saveHabit` defaults weekly habits to `0` and clamps invalid inputs to `[0, 6]` before validation. `sanitizeHabit` forces `null` for daily habits.
   - **Alternatives considered:** Throwing on invalid deadlineDay; leaving it as `null` for weekly habits.
   - **Rationale:** Matches the spec and the existing default habit; forgiving input reduces user friction.
   - **Consequences:** Corrupted/odd deadlineDay values are silently repaired rather than rejected.

4. **Collapsed the add-habit form behind a toggle button**
   - **Context:** With the form always visible, it pushed the stats section down and cluttered the daily-use view.
   - **Chosen:** A "+ Add Habit" button reveals the form. Submitting adds the habit and collapses the form again. Focus moves to the name input when opened and back to the toggle button when closed.
   - **Alternatives considered:** Leaving the form permanently open; showing it inline above the habit list.
   - **Rationale:** The primary action is checking habits, not adding them. The toggle keeps the UI clean while keeping the feature one click away.
   - **Consequences:** `aria-expanded` and `aria-controls` are used to communicate state to screen readers.

## Run: 2026-10-13 — Implement Task 7: Weekly review view

### Decisions

1. **Used a two-view navigation pattern (Dashboard / Weekly Review)**
   - **Context:** The weekly review is a separate screen from the daily dashboard. A tab-like toggle keeps both views reachable without scrolling.
   - **Chosen:** Two `<section>` elements swapped with `hidden`, plus top navigation buttons with `aria-pressed` and `aria-controls`.
   - **Alternatives considered:** Inline accordion below the stats; separate page.
   - **Rationale:** Tabs are the simplest accessible pattern for two distinct views in a single-page static app.
   - **Consequences:** The weekly review re-renders each time the view is opened, so it always reflects the latest data.

2. **Rolling 7-day grid for daily habits**
   - **Context:** The spec says "past 7 days" for the review view, while streak logic uses Monday–Sunday weeks.
   - **Chosen:** Columns are today plus the previous 6 days. Each daily habit gets a row; a cell shows ✓ if a completion exists for that day.
   - **Alternatives considered:** Current calendar week (Mon–Sun) only.
   - **Rationale:** A rolling window matches the wording in the spec and gives a consistent "last week" view regardless of which day the user opens it.
   - **Consequences:** The weekly habit row uses a separate "This week" cell because it does not map to single days.

3. **Weekly habit row uses a single spanning cell**
   - **Context:** Spec acceptance criteria require "Weekly habit shown as a separate row with a single cell for this week."
   - **Chosen:** The weekly habit name is in the first column; the second cell spans the remaining 7 day columns and shows ✓ or — for the current week.
   - **Alternatives considered:** Showing the same checkmark in every day column of the current week.
   - **Rationale:** Matches the acceptance criteria literally and avoids implying the weekly habit must be done every day.
   - **Consequences:** Slightly different row shape than daily habits; handled with `colSpan`.

### Open questions / follow-up

- MVP is now feature-complete (Tasks 1–8). A final human review of the live site is the last gate before declaring v1.2.0 done.
- v2 idea (deferred): reminders / enforcement with service-worker notifications and explicit "missed" events.
