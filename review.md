# Five-Axis Code Review + Security Hardening Report

## Review Scope
- `js/app.js` — UI rendering and state management
- `js/storage.js` — localStorage persistence
- `js/streaks.js` — streak computation
- `js/utils/date.js` — date helpers
- `index.html` — page structure

---

## Axis 1: Correctness

### Issues Found

**CRITICAL: Date drift in `handleToggle`**
`handleToggle` calls `now()` to get the completion timestamp, then calls `getAllState()` which calls `now()` again for streak calculation and period determination. If the user clicks exactly at midnight, the completion timestamp and the period boundary could land in different days/weeks, producing inconsistent data.

**Required: `handleToggle` should pass a single `referenceDate` through the entire call chain.**

**Required: `getHabitState` should accept a `referenceDate` parameter instead of calling `now()` internally.** Same for `getAllState`.

---

## Axis 2: Readability & Simplicity

### Issues Found

**Required: `updateCard` duplicates DOM structure knowledge from `createHabitCard`**
If the card layout changes in `createHabitCard`, `updateCard` will silently break because it uses `querySelector` on a structure it assumes. The two functions must stay in sync manually.

**Required: `handleToggle` calls `load()` three times** — once in `getAllState()` (twice, actually), once explicitly for `load().habits.find`. This is wasteful and obscures the data flow.

**Nit: `isPeriodEnded` in `date.js` is exported but never used.** Dead code should be removed or kept private.

---

## Axis 3: Architecture

### Issues Found

**Required: No data validation at the storage boundary**
`load()` parses localStorage JSON and trusts every field. A user with devtools (or a corrupted disk) can inject malformed data that crashes the app. The contract promises validation — it doesn't deliver it.

**Consider: `saveHabit` and `saveCompletion` callable from console with no input validation**
Since these are exported, someone could call `saveHabit({name: '<script>alert(1)</script>', frequency: 'daily'})` from console. Currently safe due to `textContent`, but defense in depth requires validation.

---

## Axis 4: Security (Focused Audit)

### Threat Model

**Trust boundaries:**
1. User input → DOM (currently only seed data, but `saveHabit` callable from console)
2. localStorage → app (untrusted: user can edit via devtools, disk corruption, another script)
3. Exported JSON → re-import (not yet implemented, but data could be shared)

**STRIDE analysis:**
- **Tampering**: localStorage can be edited by any script on the origin or via devtools.
- **Information Disclosure**: Exported JSON contains all habit names and completion timestamps. No PII risk for this app, but data is unencrypted at rest.
- **Denial of Service**: Unbounded `name` length, unbounded `completions` array → quota exceeded or render freeze.

### Vulnerabilities Found

**Required: No XSS today, but fragile safety**
Current code uses `textContent` everywhere, so injecting `<img src=x onerror=alert(1)>` into a habit name would display as literal text, not execute. This is correct. BUT:
- The `aria-label` uses string interpolation which is safe because `setAttribute` doesn't parse HTML.
- Future maintainers might switch to `innerHTML` without knowing the data is unsanitized.

**Required: Zero validation on loaded habit/completion shapes**
`load()` checks `version` and `Array.isArray()` but does not validate that each habit has `id`, `name`, `frequency`, or that each completion has the required fields. A malformed entry (missing `habitId`, wrong type for `frequency`) will crash `calculateStreak` when it accesses `habit.frequency`.

**Required: No bounds checking on `name` or `completions`**
- `name` could be a 1MB string → quota exceeded or UI freeze.
- `completions` array could be unbounded → memory exhaustion.

**Required: `exportData` returns raw JSON with no sanitization**
If a habit name contains control characters or terminal escape sequences, the exported file could be dangerous when opened in a text editor (not a web vulnerability, but a data integrity issue).

---

## Axis 5: Performance

### Issues Found

**Required: `load()` called multiple times per toggle**
`handleToggle` → `getAllState()` → `load()` × 2 + explicit `load()` = 3 JSON parses per click. For a small app this is fine, but it's unnecessary work and a maintainability issue.

**Nit: `calculateStreak` rebuilds the completion Set on every call**
For 3 habits and a year of data (~1000 completions), trivial. But if habits grow, this is O(n) per habit per render.

---

## Security Fixes Applied

See the commits that follow for:
1. Shape validation in `load()` — every habit and completion validated before use
2. Input sanitization in `saveHabit()` — name length capped, control chars stripped
3. Bounds on completions — max array size enforced
4. Export sanitization — JSON.stringify handles control chars natively
5. Date drift fix — single `referenceDate` passed through call chain
6. Reduced `load()` calls — single load per action
