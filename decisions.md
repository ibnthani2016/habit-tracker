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

### Open questions / follow-up

- Evaluate whether Task 3 (Add a habit) and Task 7 (Weekly review) should be implemented before the next refactor pass.
