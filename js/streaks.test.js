import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateStreak } from './streaks.js';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, addDays } from './utils/date.js';

// ── Helpers ────────────────────────────────────────────────

function makeDailyHabit(name = 'Test Daily') {
  return {
    id: 'habit-daily-' + Math.random().toString(36).slice(2),
    name,
    frequency: 'daily',
    deadlineDay: null,
    currentStreak: 0,
    bestStreak: 0,
    status: 'active',
    createdAt: new Date('2025-01-01').toISOString(),
  };
}

function makeWeeklyHabit(name = 'Test Weekly') {
  return {
    id: 'habit-weekly-' + Math.random().toString(36).slice(2),
    name,
    frequency: 'weekly',
    deadlineDay: 0, // Sunday
    currentStreak: 0,
    bestStreak: 0,
    status: 'active',
    createdAt: new Date('2025-01-01').toISOString(),
  };
}

function makeCompletion(habitId, date) {
  const d = new Date(date);
  return {
    id: 'comp-' + Math.random().toString(36).slice(2),
    habitId,
    completedAt: d.toISOString(),
    periodStart: startOfDay(d).toISOString(),
    periodEnd: endOfDay(d).toISOString(),
  };
}

function makeWeeklyCompletion(habitId, date) {
  const d = new Date(date);
  return {
    id: 'comp-' + Math.random().toString(36).slice(2),
    habitId,
    completedAt: d.toISOString(),
    periodStart: startOfWeek(d).toISOString(),
    periodEnd: endOfWeek(d).toISOString(),
  };
}

// ── Daily Habit Tests ────────────────────────────────────

describe('calculateStreak — daily habits', () => {
  it('returns streak 5, active when 5 consecutive days are completed', () => {
    const habit = makeDailyHabit();
    const today = new Date('2025-09-23T10:00:00'); // Tuesday 10am
    const completions = [
      makeCompletion(habit.id, '2025-09-19'), // Fri
      makeCompletion(habit.id, '2025-09-20'), // Sat
      makeCompletion(habit.id, '2025-09-21'), // Sun
      makeCompletion(habit.id, '2025-09-22'), // Mon
      makeCompletion(habit.id, '2025-09-23'), // Tue (today)
    ];

    const result = calculateStreak(habit, completions, today);

    assert.strictEqual(result.currentStreak, 5, 'current streak should be 5');
    assert.strictEqual(result.bestStreak, 5, 'best streak should be 5');
    assert.strictEqual(result.status, 'active', 'status should be active');
  });

  it('returns streak 1, active when today is not done yet but yesterday was', () => {
    const habit = makeDailyHabit();
    const today = new Date('2025-09-23T10:00:00'); // Tuesday 10am
    const completions = [
      makeCompletion(habit.id, '2025-09-22'), // Mon (yesterday)
    ];

    const result = calculateStreak(habit, completions, today);

    assert.strictEqual(result.currentStreak, 1, 'current streak should be 1 (yesterday only)');
    assert.strictEqual(result.bestStreak, 1, 'best streak should be 1');
    assert.strictEqual(result.status, 'active', 'status should be active (today still open)');
  });

  it('returns streak 0, broken when yesterday was missed', () => {
    const habit = makeDailyHabit();
    const today = new Date('2025-09-23T10:00:00'); // Tuesday 10am
    // Completed Saturday, missed Sunday and Monday, today Tuesday not done
    const completions = [
      makeCompletion(habit.id, '2025-09-20'), // Sat
    ];

    const result = calculateStreak(habit, completions, today);

    assert.strictEqual(result.currentStreak, 0, 'current streak should be 0 (broken)');
    assert.strictEqual(result.bestStreak, 1, 'best streak should be 1');
    assert.strictEqual(result.status, 'broken', 'status should be broken (yesterday missed)');
  });

  it('returns bestStreak 3 when current streak is 1 after a gap', () => {
    const habit = makeDailyHabit();
    const today = new Date('2025-09-23T10:00:00'); // Tuesday 10am
    // Streak of 3: Fri-Sat-Sun, then missed Mon, completed today (Tue) not done yet
    const completions = [
      makeCompletion(habit.id, '2025-09-19'), // Fri
      makeCompletion(habit.id, '2025-09-20'), // Sat
      makeCompletion(habit.id, '2025-09-21'), // Sun
      // Mon missed
      // Tue (today) not done
    ];

    const result = calculateStreak(habit, completions, today);

    assert.strictEqual(result.currentStreak, 0, 'current streak should be 0 (Mon missed)');
    assert.strictEqual(result.bestStreak, 3, 'best streak should be 3 (Fri-Sat-Sun)');
    assert.strictEqual(result.status, 'broken', 'status should be broken');
  });

  it('returns streak 0, broken when there are no completions', () => {
    const habit = makeDailyHabit();
    const today = new Date('2025-09-23T10:00:00');

    const result = calculateStreak(habit, [], today);

    assert.strictEqual(result.currentStreak, 0);
    assert.strictEqual(result.bestStreak, 0);
    assert.strictEqual(result.status, 'broken');
  });
});

// ── Weekly Habit Tests ─────────────────────────────────────

describe('calculateStreak — weekly habits', () => {
  it('returns streak 1, active when completed this week', () => {
    const habit = makeWeeklyHabit();
    // Week of Mon Sep 15 – Sun Sep 21, today is Wed Sep 17
    const today = new Date('2025-09-17T10:00:00');
    const completions = [
      makeWeeklyCompletion(habit.id, '2025-09-17'), // Wed this week
    ];

    const result = calculateStreak(habit, completions, today);

    assert.strictEqual(result.currentStreak, 1, 'current streak should be 1');
    assert.strictEqual(result.bestStreak, 1, 'best streak should be 1');
    assert.strictEqual(result.status, 'active', 'status should be active');
  });

  it('returns streak 0, broken when last week was missed', () => {
    const habit = makeWeeklyHabit();
    // Current week: Mon Sep 15 – Sun Sep 21
    // Today: Mon Sep 22 (next week)
    const today = new Date('2025-09-22T10:00:00');
    // Completed week of Sep 1–7, missed Sep 8–14
    const completions = [
      makeWeeklyCompletion(habit.id, '2025-09-03'), // Week of Sep 1–7
    ];

    const result = calculateStreak(habit, completions, today);

    assert.strictEqual(result.currentStreak, 0, 'current streak should be 0');
    assert.strictEqual(result.bestStreak, 1, 'best streak should be 1');
    assert.strictEqual(result.status, 'broken', 'status should be broken (last week missed)');
  });

  it('counts consecutive weekly completions correctly', () => {
    const habit = makeWeeklyHabit();
    // Current week: Mon Sep 15 – Sun Sep 21, today is Wed Sep 17
    const today = new Date('2025-09-17T10:00:00');
    const completions = [
      makeWeeklyCompletion(habit.id, '2025-09-03'), // Week of Sep 1–7
      makeWeeklyCompletion(habit.id, '2025-09-10'), // Week of Sep 8–14
      makeWeeklyCompletion(habit.id, '2025-09-17'), // Week of Sep 15–21 (current)
    ];

    const result = calculateStreak(habit, completions, today);

    assert.strictEqual(result.currentStreak, 3, 'current streak should be 3');
    assert.strictEqual(result.bestStreak, 3, 'best streak should be 3');
    assert.strictEqual(result.status, 'active');
  });
});

// ── Edge Cases ─────────────────────────────────────────────

describe('calculateStreak — edge cases', () => {
  it('recalculates to broken when todays completion is removed', () => {
    const habit = makeDailyHabit();
    const today = new Date('2025-09-23T10:00:00');

    const withToday = [
      makeCompletion(habit.id, '2025-09-22'),
      makeCompletion(habit.id, '2025-09-23'),
    ];
    const resultWithToday = calculateStreak(habit, withToday, today);
    assert.strictEqual(resultWithToday.currentStreak, 2);

    const withoutToday = [
      makeCompletion(habit.id, '2025-09-22'),
    ];
    const resultWithoutToday = calculateStreak(habit, withoutToday, today);
    assert.strictEqual(resultWithoutToday.currentStreak, 1, 'streak drops to 1 when today removed');
    assert.strictEqual(resultWithoutToday.status, 'active', 'still active because yesterday done');
  });

  it('recalculates to broken when yesterday is removed', () => {
    const habit = makeDailyHabit();
    const today = new Date('2025-09-23T10:00:00');
    const completions = [
      makeCompletion(habit.id, '2025-09-22'), // yesterday
    ];

    // Remove yesterday
    const result = calculateStreak(habit, [], today);
    assert.strictEqual(result.currentStreak, 0);
    assert.strictEqual(result.status, 'broken');
  });
});
