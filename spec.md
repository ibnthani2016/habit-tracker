# Habit Tracker — Productivity Focus

## Overview
A local-first habit tracker focused on productivity. Three habits, streak-based motivation, zero cloud dependency.

---

## Habits

| # | Habit | Frequency | Deadline |
|---|-------|-----------|----------|
| 1 | Improve knowledge base | Daily | End of day (23:59) |
| 2 | Keep health routine | Daily | End of day (23:59) |
| 3 | Start or complete a project | Weekly | Sunday (23:59) |

---

## Streak System

- **Requirement**: Perfect consecutive completion. One miss = streak breaks.
- **Grace buffer**: None.
- **Miss behavior**:
  - Habit status changes to **"broken"**
  - Streak counter shows current broken state (e.g., "🔥 0" or "💔")
  - Visual indicator (red/dimmed) until habit is completed again
  - New streak begins on next successful completion

### Daily Habits
- Reset window: midnight local time
- A "day" runs 00:00 – 23:59
- Completing after midnight counts for the new day, not the missed day

### Weekly Habit
- Tracking period: Monday 00:00 – Sunday 23:59
- Must be completed at least once during that window
- If incomplete by Sunday 23:59, streak breaks
- Can complete early in the week (e.g., Tuesday) — still counts for that week

---

## Data Model

```
Habit
  - id (string)
  - name (string)
  - frequency: "daily" | "weekly"
  - deadlineDay: 0-6 (0=Sunday) for weekly; null for daily
  - currentStreak (integer)
  - bestStreak (integer)
  - status: "active" | "broken"
  - createdAt (timestamp)

Completion
  - id (string)
  - habitId (string)
  - completedAt (timestamp)
  - periodStart (timestamp) — start of day/week this completion counts for
  - periodEnd (timestamp) — end of day/week this completion counts for
```

---

## Storage

- **All data persisted locally on device only**
- Storage: `localStorage` (web) / SQLite (native) / filesystem (desktop)
- No network calls, no cloud sync, no backup service
- Export: Optional JSON dump for user to manually save

---

## UI Views

1. **Dashboard** — Today view showing all 3 habits, check-off buttons, streak counts, status indicators
2. **Weekly Review** — Calendar-style grid showing past 7 days, which habits hit/missed
3. **Habit Detail** — Streak history, best streak, completion log
4. **Settings** — Data export (JSON), reset all data, dark/light mode

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| User marks daily habit complete, then unchecks same day | Remove completion record; recalculate streak from history |
| User misses Monday, completes Tuesday | Tuesday counts for Tuesday only; Monday stays missed; streak resets to 1 |
| Weekly habit completed on Wednesday | Counts for current week; cannot "complete again" until next Monday |
| App opened after midnight with missed daily | Show "broken" status immediately; do not allow retroactive check |
| Device time changed manually | Honor system time; no anti-cheat (trusted local use) |

---

## Tech Notes

- Local-first = works offline entirely
- Streak calculation: query completions, reconstruct consecutive periods backward from now
- Weekly logic: ISO week or simple Monday–Sunday window (user said "by Sunday" — assume Monday start)
