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

### Open questions / follow-up

- Task 7 (Weekly review view) remains the only unimplemented MVP task.
