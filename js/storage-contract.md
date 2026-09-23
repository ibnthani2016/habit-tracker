# Storage Module Contract

## Purpose
Single source of truth for all habit-tracker data in `localStorage`. All reads and writes go through this module. No other code touches `localStorage` directly.

## Storage Key
```
habit-tracker:data
```

## Data Schema (Current: v1)

```js
{
  version: 1,
  habits: [
    {
      id: string,           // uuid
      name: string,
      frequency: "daily" | "weekly",
      deadlineDay: null | 0,  // 0=Sunday for weekly; null for daily
      createdAt: string,    // ISO 8601
    }
  ],
  completions: [
    {
      id: string,           // uuid
      habitId: string,      // references habit.id
      completedAt: string, // ISO 8601
      periodStart: string,  // ISO 8601 — start of day/week
      periodEnd: string,    // ISO 8601 — end of day/week
    }
  ]
}
```

## Rules

1. **Streak fields are never persisted.** `currentStreak`, `bestStreak`, and `status` on `Habit` are computed at runtime by the streak engine. The storage module ignores them on save and never returns them on load.

2. **Habits are append-only.** Deleting a habit is not supported in v1.

3. **Completions are idempotent by period.** Saving a second completion for the same habit+period replaces the first (prevents duplicates).

## API

### `load()`
Returns the current data state.

| Condition | Return Value |
|-----------|-------------|
| Key missing | `{ version: 1, habits: DEFAULT_HABITS, completions: [] }` |
| Key exists, valid v1 | Parsed data, `habits` and `completions` arrays |
| Key exists, older version | Migrated to v1, then returned |
| Key exists, corrupt JSON | `{ version: 1, habits: DEFAULT_HABITS, completions: [] }` (warning to console) |
| Key exists, valid JSON but invalid schema | `{ version: 1, habits: DEFAULT_HABITS, completions: [] }` (warning to console) |

### `saveHabit(habit)`
Appends a habit to the stored list. Assigns `id` and `createdAt` if missing. Returns the saved habit.

### `removeHabit(id)`
Removes habit and all its completions. Returns `true` if found.

### `saveCompletion(completion)`
Saves a completion. If a completion already exists for the same `habitId` + `periodStart`, replaces it. Returns the saved completion.

### `removeCompletion(habitId, periodStart)`
Removes the completion matching `habitId` + `periodStart`. Returns `true` if found.

### `getCompletionForPeriod(habitId, periodStart)`
Returns the single completion for a habit+period, or `null`.

### `clearAll()`
Wipes the storage key. Next `load()` will re-seed defaults.

### `exportData()`
Returns a JSON blob string of the raw stored data (for user download).

## Default Habits (seeded on first load)

```js
[
  { id: "h-1", name: "Improve knowledge base", frequency: "daily", deadlineDay: null },
  { id: "h-2", name: "Keep health routine", frequency: "daily", deadlineDay: null },
  { id: "h-3", name: "Start or complete a project", frequency: "weekly", deadlineDay: 0 }
]
```

## Migration Strategy

| From | To | Action |
|------|-----|--------|
| missing | v1 | Seed defaults |
| v0 (pre-versioned) | v1 | Wrap raw arrays in `{ version: 1, ... }`, seed missing fields |
| future v2 | — | Not yet defined; load will warn and fall back to defaults |

## Error Handling

- `localStorage` quota exceeded: catch `QuotaExceededError`, throw user-friendly error
- `localStorage` unavailable (private browsing, disabled): throw descriptive error
- Corrupt data: silently reset to defaults with console warning

## Invariants

After every operation:
- All habit IDs are unique strings
- All completion `habitId`s reference an existing habit
- `periodStart` < `periodEnd` for every completion
- `completedAt` is between `periodStart` and `periodEnd` (inclusive)
