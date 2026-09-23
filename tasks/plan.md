# Implementation Plan: Habit Tracker

## Overview
A local-first, browser-based habit tracker for three productivity habits (2 daily, 1 weekly). All data in localStorage. Features: add habits, mark periods complete, real-time streak calculation with broken status, dashboard stats, weekly review, and data export/reset.

---

## Architecture Decisions
- **Stack:** Vanilla HTML/CSS/JS — no build step, works entirely offline in a single browser tab.
- **Storage:** `localStorage` with a single JSON key per entity type (`habits`, `completions`). All reads/writes go through a central store module.
- **Streak engine:** Pure function that reconstructs streak state from completion history on every load/check. No cached streak counters in storage — prevents drift.
- **Date math:** Use native `Date` with helper functions for day/week boundaries. Monday–Sunday week window per spec. No timezone handling beyond local system time.
- **State management:** Direct DOM updates driven by storage changes. No framework — keeps it single-file friendly.

---

## Task List

### Phase 1: Foundation

## Task 1: Project scaffold and shared types

**Description:** Create the project files, HTML shell, CSS baseline, and JavaScript type definitions / data shapes for `Habit` and `Completion`.

**Acceptance criteria:**
- [ ] `index.html` loads without errors and renders a shell title "Habit Tracker"
- [ ] `js/types.js` exports the data shapes matching the spec's data model (id, name, frequency, deadlineDay, currentStreak, bestStreak, status, createdAt for Habit; id, habitId, completedAt, periodStart, periodEnd for Completion)
- [ ] `js/utils/date.js` has helpers: `startOfDay(date)`, `endOfDay(date)`, `startOfWeek(date)`, `endOfWeek(date)`, `formatDate(date)`

**Verification:**
- [ ] Open `index.html` in browser — no console errors
- [ ] Manual check: in console, `startOfDay(new Date())` returns 00:00:00 of today
- [ ] Manual check: `startOfWeek(new Date())` returns Monday 00:00:00 of current week

**Dependencies:** None

**Files likely touched:**
- `index.html`
- `css/main.css`
- `js/types.js`
- `js/utils/date.js`

**Estimated scope:** Small (1–2 files of logic, 2–3 config/shell files)

---

## Task 2: localStorage persistence layer

**Description:** Build the storage module that reads/writes habits and completions to `localStorage` as JSON. Must handle missing keys gracefully (return empty arrays).

**Acceptance criteria:**
- [ ] `js/store.js` exposes: `getHabits()`, `saveHabit(habit)`, `getCompletions()`, `saveCompletion(completion)`, `deleteCompletion(id)`, `clearAll()`
- [ ] Data survives page reload (verified via Application tab in DevTools)
- [ ] Invalid JSON in localStorage returns empty arrays instead of crashing

**Verification:**
- [ ] Manual check: call `saveHabit({...})` in console, reload page, `getHabits()` returns the saved habit
- [ ] Manual check: call `clearAll()`, reload, both arrays are empty
- [ ] Build succeeds: open `index.html`, no console errors

**Dependencies:** Task 1

**Files likely touched:**
- `js/store.js`

**Estimated scope:** XS (1 file)

---

### Checkpoint: Foundation
- [ ] `index.html` opens without errors
- [ ] Date helpers return correct boundaries
- [ ] Store read/write survives reload
- [ ] Clear function works

---

### Phase 2: Core CRUD

## Task 3: Add a habit

**Description:** UI and logic to create a new habit. Form collects name, frequency (daily/weekly), and deadline day (for weekly). On submit, habit is saved to store and rendered in the habit list. Also seeds the 3 default habits from the spec on first load if store is empty.

**Acceptance criteria:**
- [ ] Empty store auto-seeds: "Improve knowledge base" (daily), "Keep health routine" (daily), "Start or complete a project" (weekly, deadline Sunday)
- [ ] Form exists to add a new habit: name input, frequency select, conditional deadline day select
- [ ] Submitting the form saves habit to store and immediately renders it
- [ ] Duplicate names are allowed (no unique constraint needed for v1)

**Verification:**
- [ ] Manual check: open app in fresh browser/incognito — 3 default habits appear
- [ ] Manual check: add "Read docs" (daily) — appears in list, survives reload
- [ ] Build succeeds: no console errors after adding habits

**Dependencies:** Task 2

**Files likely touched:**
- `js/habit-form.js`
- `js/habit-list.js`
- `index.html` (add form and list containers)
- `css/main.css` (form/list styling)

**Estimated scope:** Small–Medium (3–5 files)

---

## Task 4: Mark a day/week done (complete/uncomplete)

**Description:** Each habit card has a checkbox/toggle. Clicking marks the current period (today for daily, this week for weekly) as complete. Clicking again uncompletes it. Completions are saved to store with correct `periodStart` and `periodEnd`. Daily habit can only be checked once per day; weekly habit can only be checked once per week.

**Acceptance criteria:**
- [ ] Daily habits show a checkbox labeled for "today"
- [ ] Weekly habit shows a checkbox labeled for "this week"
- [ ] Checking a daily habit creates a Completion with `periodStart = startOfDay(today)`, `periodEnd = endOfDay(today)`
- [ ] Checking a weekly habit creates a Completion with `periodStart = startOfWeek(today)`, `periodEnd = endOfWeek(today)`
- [ ] Unchecking removes the matching completion record for the current period
- [ ] Once checked, checkbox shows checked state until unclicked or period resets

**Verification:**
- [ ] Manual check: check a daily habit, verify in DevTools Application tab that a completion exists with correct timestamps
- [ ] Manual check: uncheck same habit, completion is removed
- [ ] Manual check: check weekly habit on Wednesday, uncheck on Thursday — completion removed, re-checking creates new completion for same week
- [ ] Build succeeds: no console errors

**Dependencies:** Task 3

**Files likely touched:**
- `js/habit-list.js` (add checkbox handlers)
- `js/completion.js` (create/remove completion logic)
- `js/store.js` (may need `findCompletionForPeriod` helper)

**Estimated scope:** Small (2–3 files)

---

### Checkpoint: Core CRUD
- [ ] Add habits form works and seeds defaults correctly
- [ ] Complete/uncomplete toggles persist across reload
- [ ] Completions have correct periodStart/periodEnd
- [ ] Weekly habit can be completed once per week only

---

### Phase 3: Streak Engine + Dashboard

## Task 5: Streak computation engine ✅ (committed as `3bd9521`)

**Description:** Build a pure function `calculateStreak(habit, completions[])` that returns `{ currentStreak, bestStreak, status }`. For daily habits, walk backwards day-by-day from today. For weekly habits, walk backwards week-by-week from current week. Broken status when a gap is found. Best streak is the max consecutive run in history.

**Acceptance criteria:**
- [ ] Daily habit completed every day for 5 days → currentStreak = 5, status = "active"
- [ ] Daily habit missed yesterday → currentStreak = 0, status = "broken"
- [ ] Weekly habit completed this week → currentStreak increments, status = "active"
- [ ] Weekly habit missed last week → currentStreak = 0, status = "broken"
- [ ] bestStreak tracks the longest historical streak across all periods
- [ ] Unchecking a completion in the current period immediately recalculates and may set "broken"

**Verification:**
- [ ] Manual check: seed fake completions in console for a daily habit (every day for 3 days), verify `calculateStreak` returns streak=3
- [ ] Manual check: remove middle day completion, verify streak resets to 0 and status="broken"
- [ ] Manual check: for weekly habit, add completions for 3 consecutive weeks, verify streak=3
- [ ] Build succeeds: no console errors

**Dependencies:** Task 4

**Files likely touched:**
- `js/streaks.js`
- `js/types.js` (if status enum needs constants)

**Estimated scope:** Medium (2–3 files, complex logic)

---

## Task 6: Dashboard with stats and status indicators

**Description:** Render the today-view dashboard: all habits with their checkboxes, current streak counter, status badge (active = green/fire, broken = red/dimmed), and a summary stats bar (total active habits, longest best streak across all habits).

**Acceptance criteria:**
- [ ] Each habit card shows: name, frequency, checkbox, streak count, status badge
- [ ] Active habits show fire emoji or green styling; broken habits show broken styling per spec
- [ ] Stats bar shows: total habits, active habits count, overall best streak
- [ ] Dashboard updates immediately when a habit is checked/unchecked (reactive)
- [ ] On first load after midnight with a missed daily habit, broken status shows automatically

**Verification:**
- [ ] Manual check: all 3 seeded habits visible with checkboxes
- [ ] Manual check: check a habit → streak increments, badge stays active
- [ ] Manual check: uncheck a habit with streak=1 → status changes to "broken", styling updates
- [ ] Build succeeds: no console errors

**Dependencies:** Task 5

**Files likely touched:**
- `js/dashboard.js`
- `js/habit-list.js` (modify to integrate streak display)
- `css/main.css` (status styling)
- `index.html` (dashboard container)

**Estimated scope:** Medium (3–4 files)

---

### Checkpoint: Streak + Dashboard
- [ ] Check/uncheck immediately updates streak and status visually
- [ ] Broken habits are visually distinct
- [ ] Stats summary is accurate
- [ ] All acceptance criteria from Tasks 1–6 pass

---

### Phase 4: Review + Polish

## Task 7: Weekly review view

**Description:** A second view (tab or section) showing a calendar-style grid of the past 7 days. Each cell shows which daily habits were completed on that day. The weekly habit is shown as a row with the current week's status.

**Acceptance criteria:**
- [ ] Grid shows last 7 days as columns (dates labeled)
- [ ] Rows are the daily habits; cells show checkmark or empty
- [ ] Weekly habit shown as a separate row with a single cell for this week
- [ ] Clicking a day navigates to that day's detail (or shows a tooltip)
- [ ] View is reachable from the dashboard via a "Weekly Review" button/tab

**Verification:**
- [ ] Manual check: complete a habit today, switch to weekly review — today shows a checkmark
- [ ] Manual check: incomplete habits show empty cells
- [ ] Build succeeds: no console errors

**Dependencies:** Task 6

**Files likely touched:**
- `js/weekly-review.js`
- `index.html` (review section + nav)
- `css/main.css` (grid styling)

**Estimated scope:** Small (2–3 files)

---

## Task 8: Data export, reset, and settings

**Description:** A settings view with: (1) "Export Data" button that downloads `habits.json` containing all habits and completions, (2) "Reset All Data" button with a confirmation dialog that clears localStorage and reloads the page.

**Acceptance criteria:**
- [ ] Export button triggers download of a JSON file named `habit-tracker-backup-<date>.json`
- [ ] Exported JSON contains both `habits` and `completions` arrays
- [ ] Reset button shows a browser `confirm()` dialog
- [ ] Confirming reset clears localStorage, reloads page, and re-seeds default habits
- [ ] Settings view reachable from dashboard via a gear icon or button

**Verification:**
- [ ] Manual check: click Export, verify downloaded JSON has habits and completions
- [ ] Manual check: click Reset → confirm → page reloads with only 3 default habits
- [ ] Build succeeds: no console errors

**Dependencies:** Task 6

**Files likely touched:**
- `js/settings.js`
- `index.html` (settings section)
- `css/main.css` (settings styling)

**Estimated scope:** Small (2–3 files)

---

### Checkpoint: Complete
- [ ] All 8 tasks acceptance criteria met
- [ ] End-to-end flow: add habit → mark complete → streak updates → weekly review shows it → export data → reset data
- [ ] No console errors
- [ ] Review with human before declaring done

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Date math bugs (DST, month boundaries) | High | Use helper functions for all date manipulation; test streak calc with seeded edge-case data in console |
| localStorage quota exceeded | Medium | Add guard: if `setItem` throws quota error, alert user to export/reset; keep data minimal (no logs) |
| Streak recalculation performance with many completions | Low | Lazy recalc only when needed; completions are small (3 habits × 365 days = ~1K records, trivial) |
| User manually edits localStorage | Low | Out of scope — trusted local use per spec |

---

## Open Questions
- Should the weekly review show 7 rolling days or the current calendar week (Mon–Sun)? (Spec says "past 7 days" in UI views but Monday–Sunday in streak logic. Using rolling 7 days for review, Mon–Sun for streaks.)
- Do we want a "delete habit" feature, or just hide/archive? (Not in spec — skip for MVP.)
- Dark/light mode toggle? (Spec mentions Settings view — include as Task 8 stretch if time permits.)
