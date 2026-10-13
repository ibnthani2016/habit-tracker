# Task List: Habit Tracker

## Phase 1: Foundation
- [x] Task 1: Project scaffold and shared types
- [x] Task 2: localStorage persistence layer

## Checkpoint: Foundation ✅
- [x] `index.html` opens without errors
- [x] Date helpers return correct boundaries
- [x] Store read/write survives reload
- [x] Clear function works

## Phase 2: Core CRUD
- [x] Task 3: Add a habit
- [x] Task 4: Mark a day/week done (complete/uncomplete)

## Checkpoint: Core CRUD ✅
- [x] Default habits seeded on first load
- [x] Complete/uncomplete toggles persist across reload
- [x] Completions have correct periodStart/periodEnd
- [x] Weekly habit can be completed once per week only

## Phase 3: Streak Engine + Dashboard
- [x] Task 5: Streak computation engine
- [x] Task 6: Dashboard with stats and status indicators

## Checkpoint: Streak + Dashboard ✅
- [x] Check/uncheck immediately updates streak and status visually
- [x] Broken habits are visually distinct (red border-left, dimmed, 💔 icon)
- [x] Stats summary is accurate (habits, active, best streak)
- [x] All acceptance criteria from Tasks 1–6 pass

## Phase 4: Review + Polish
- [ ] Task 7: Weekly review view
- [x] Task 8: Data export, reset (settings UI stretch)

## Shipping + Launch ✅
- [x] Pre-launch checklist completed
- [x] Feature flag for "Add Habit" (ENABLE_ADD_HABIT)
- [x] Deploy plan to GitHub Pages (with CI workflow)
- [x] Rollback plan documented
- [x] Post-deploy checklist ready

## Security + Quality Review ✅
- [x] Five-axis code review (correctness, readability, architecture, security, performance)
- [x] Security hardening: XSS defense (textContent, input validation)
- [x] Security hardening: localStorage validation (shape checks, bounds, sanitization)
- [x] Date drift fix: single referenceDate through call chain
- [x] Redundant load() calls eliminated
- [x] 34 tests passing (25 original + 9 security)
- [x] Browser verification passed after hardening

## Checkpoint: Complete
- [ ] All 8 tasks acceptance criteria met
- [ ] End-to-end flow: add habit → mark complete → streak updates → weekly review shows it → export data → reset data
- [ ] No console errors
- [ ] Review with human before declaring done
