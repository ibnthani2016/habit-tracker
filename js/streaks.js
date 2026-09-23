/**
 * Streak computation engine.
 * Pure functions — no side effects, no DOM, no storage.
 */

import { startOfDay, endOfDay, startOfWeek, endOfWeek, addDays, addWeeks } from './utils/date.js';

/**
 * Calculate current streak, best streak, and status for a habit.
 *
 * @param {object} habit — the habit object
 * @param {object[]} completions — all completion records
 * @param {Date} [referenceDate] — date to evaluate from (default: now)
 * @returns {{ currentStreak: number, bestStreak: number, status: 'active' | 'broken' }}
 */
export function calculateStreak(habit, completions, referenceDate = new Date()) {
  const ref = new Date(referenceDate);

  const isDaily = habit.frequency === 'daily';
  const getPeriodStart = isDaily ? startOfDay : startOfWeek;
  const getPeriodEnd = isDaily ? endOfDay : endOfWeek;
  const getPrevious = isDaily
    ? (d) => addDays(d, -1)
    : (d) => addWeeks(d, -1);

  // Build a set of completed period-start timestamps for this habit
  const completedPeriods = new Set();
  for (const c of completions) {
    if (c.habitId === habit.id) {
      completedPeriods.add(new Date(c.periodStart).getTime());
    }
  }

  function hasCompletion(periodStart) {
    return completedPeriods.has(periodStart.getTime());
  }

  // ── Current streak ───────────────────────────────────────

  let currentStreak = 0;

  let period = getPeriodStart(ref);

  // Current period: may still be open
  const currentPeriodEnd = getPeriodEnd(period);
  const currentPeriodEnded = currentPeriodEnd < ref;

  if (hasCompletion(period)) {
    currentStreak += 1;
    period = getPrevious(period);
  } else if (!currentPeriodEnded) {
    // Still open and not done — check previous periods
    period = getPrevious(period);
  } else {
    // Ended without completion → broken immediately
    return {
      currentStreak: 0,
      bestStreak: calculateBestStreak(habit, completions, isDaily),
      status: 'broken',
    };
  }

  // Walk backwards through ended periods
  while (true) {
    if (hasCompletion(period)) {
      currentStreak += 1;
      period = getPrevious(period);
    } else {
      break;
    }
  }

  const status = currentStreak > 0 ? 'active' : 'broken';

  // ── Best streak ────────────────────────────────────────

  const bestStreak = calculateBestStreak(habit, completions, isDaily);

  return { currentStreak, bestStreak, status };
}

/**
 * Find the longest consecutive run of completed periods in history.
 *
 * @param {object} habit
 * @param {object[]} completions
 * @param {boolean} isDaily
 * @returns {number}
 */
function calculateBestStreak(habit, completions, isDaily) {
  const habitCompletions = completions.filter((c) => c.habitId === habit.id);
  if (habitCompletions.length === 0) return 0;

  // Unique, sorted period-start timestamps (ascending)
  const periodStarts = [...new Set(
    habitCompletions.map((c) => new Date(c.periodStart).getTime())
  )].sort((a, b) => a - b);

  let best = 1;
  let current = 1;

  for (let i = 1; i < periodStarts.length; i++) {
    const prev = periodStarts[i - 1];
    const curr = periodStarts[i];

    const expected = isDaily
      ? addDays(new Date(prev), 1).getTime()
      : addWeeks(new Date(prev), 1).getTime();

    if (curr === expected) {
      current += 1;
    } else {
      best = Math.max(best, current);
      current = 1;
    }
  }

  best = Math.max(best, current);
  return best;
}
