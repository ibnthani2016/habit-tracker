import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

// ── localStorage mock (Node has no localStorage) ─────────
const store = new Map();
const localStorageMock = {
  getItem(key) { return store.has(key) ? store.get(key) : null; },
  setItem(key, value) { store.set(key, value); },
  removeItem(key) { store.delete(key); },
};

globalThis.localStorage = localStorageMock;

// Must import AFTER mock is set
const {
  load, saveHabit, removeHabit, saveCompletion,
  removeCompletion, getCompletionForPeriod, clearAll, exportData,
} = await import('./storage.js');

beforeEach(() => {
  store.clear();
});

// ── load() ───────────────────────────────────────────────

describe('load', () => {
  it('seeds default habits when localStorage key is missing', () => {
    const data = load();

    assert.strictEqual(data.version, 1);
    assert.strictEqual(data.habits.length, 3);
    assert.strictEqual(data.habits[0].name, 'Improve knowledge base');
    assert.strictEqual(data.habits[0].frequency, 'daily');
    assert.strictEqual(data.habits[1].name, 'Keep health routine');
    assert.strictEqual(data.habits[2].name, 'Start or complete a project');
    assert.strictEqual(data.habits[2].frequency, 'weekly');
    assert.deepStrictEqual(data.completions, []);
  });

  it('returns stored data when key exists and is valid', () => {
    const stored = {
      version: 1,
      habits: [{ id: 'h-99', name: 'Custom', frequency: 'daily', deadlineDay: null, createdAt: '2025-01-01' }],
      completions: [],
    };
    store.set('habit-tracker:data', JSON.stringify(stored));

    const data = load();
    assert.strictEqual(data.habits[0].id, 'h-99');
    assert.strictEqual(data.habits[0].name, 'Custom');
  });

  it('resets to defaults when stored JSON is corrupt', () => {
    store.set('habit-tracker:data', 'not-json{');

    const data = load();
    assert.strictEqual(data.habits.length, 3); // defaults seeded
    assert.deepStrictEqual(data.completions, []);
  });

  it('resets to defaults when stored data has no version field', () => {
    store.set('habit-tracker:data', JSON.stringify({ habits: [], completions: [] }));

    const data = load();
    assert.strictEqual(data.version, 1);
    assert.strictEqual(data.habits.length, 3); // defaults
  });
});

// ── saveHabit() ──────────────────────────────────────────

describe('saveHabit', () => {
  it('appends a habit and persists it', () => {
    load(); // seed defaults

    const habit = saveHabit({ name: 'Read docs', frequency: 'daily', deadlineDay: null });

    assert.ok(habit.id, 'should assign an id');
    assert.ok(habit.createdAt, 'should assign createdAt');
    assert.strictEqual(habit.name, 'Read docs');

    const data = load();
    assert.strictEqual(data.habits.length, 4);
    assert.ok(data.habits.find(h => h.name === 'Read docs'));
  });

  it('preserves existing id and createdAt if provided', () => {
    load();

    const habit = saveHabit({ id: 'custom-id', name: 'Custom', frequency: 'daily', createdAt: '2025-06-01' });

    assert.strictEqual(habit.id, 'custom-id');
    assert.strictEqual(habit.createdAt, '2025-06-01');
  });
});

// ── saveCompletion() ─────────────────────────────────────

describe('saveCompletion', () => {
  it('saves a completion and persists it', () => {
    load();
    const habitId = load().habits[0].id;

    const completion = saveCompletion({
      habitId,
      completedAt: '2025-09-23T10:00:00',
      periodStart: '2025-09-23T00:00:00',
      periodEnd: '2025-09-23T23:59:59',
    });

    assert.ok(completion.id, 'should assign an id');
    assert.strictEqual(completion.habitId, habitId);

    const data = load();
    assert.strictEqual(data.completions.length, 1);
  });

  it('replaces existing completion for same habit+period', () => {
    load();
    const habitId = load().habits[0].id;

    const c1 = saveCompletion({
      habitId,
      completedAt: '2025-09-23T10:00:00',
      periodStart: '2025-09-23T00:00:00',
      periodEnd: '2025-09-23T23:59:59',
    });

    const c2 = saveCompletion({
      habitId,
      completedAt: '2025-09-23T15:00:00',
      periodStart: '2025-09-23T00:00:00',
      periodEnd: '2025-09-23T23:59:59',
    });

    const data = load();
    assert.strictEqual(data.completions.length, 1, 'should deduplicate by period');
    assert.ok(data.completions[0].completedAt.includes('15:00:00'), 'should keep later completion');
    assert.notStrictEqual(c1.id, c2.id); // new id assigned
  });
});

// ── getCompletionForPeriod() ─────────────────────────────

describe('getCompletionForPeriod', () => {
  it('returns the completion for a habit+period', () => {
    load();
    const habitId = load().habits[0].id;

    saveCompletion({
      habitId,
      completedAt: '2025-09-23T10:00:00',
      periodStart: '2025-09-23T00:00:00',
      periodEnd: '2025-09-23T23:59:59',
    });

    const found = getCompletionForPeriod(habitId, '2025-09-23T00:00:00');
    assert.ok(found);
    assert.strictEqual(found.periodStart, '2025-09-23T00:00:00');
  });

  it('returns null when no completion exists', () => {
    load();
    const habitId = load().habits[0].id;

    const found = getCompletionForPeriod(habitId, '2025-09-23T00:00:00');
    assert.strictEqual(found, null);
  });
});

// ── removeCompletion() ───────────────────────────────────

describe('removeCompletion', () => {
  it('removes a completion by habitId+periodStart', () => {
    load();
    const habitId = load().habits[0].id;

    saveCompletion({
      habitId,
      completedAt: '2025-09-23T10:00:00',
      periodStart: '2025-09-23T00:00:00',
      periodEnd: '2025-09-23T23:59:59',
    });

    const removed = removeCompletion(habitId, '2025-09-23T00:00:00');
    assert.strictEqual(removed, true);

    const data = load();
    assert.strictEqual(data.completions.length, 0);
  });

  it('returns false when no matching completion', () => {
    load();
    const removed = removeCompletion('nonexistent', '2025-09-23T00:00:00');
    assert.strictEqual(removed, false);
  });
});

// ── removeHabit() ────────────────────────────────────────

describe('removeHabit', () => {
  it('removes habit and all its completions', () => {
    load();
    const habitId = load().habits[0].id;

    saveCompletion({
      habitId,
      completedAt: '2025-09-23T10:00:00',
      periodStart: '2025-09-23T00:00:00',
      periodEnd: '2025-09-23T23:59:59',
    });

    const removed = removeHabit(habitId);
    assert.strictEqual(removed, true);

    const data = load();
    assert.ok(!data.habits.find(h => h.id === habitId), 'habit should be gone');
    assert.ok(!data.completions.find(c => c.habitId === habitId), 'completions should be gone');
  });
});

// ── clearAll() ───────────────────────────────────────────

describe('clearAll', () => {
  it('wipes storage and next load re-seeds defaults', () => {
    load();
    saveHabit({ name: 'Extra', frequency: 'daily' });

    clearAll();

    const data = load();
    assert.strictEqual(data.habits.length, 3, 'should re-seed defaults');
    assert.deepStrictEqual(data.completions, []);
  });
});

// ── exportData() ─────────────────────────────────────────

describe('exportData', () => {
  it('returns a JSON string of stored data', () => {
    load();
    const json = exportData();
    const parsed = JSON.parse(json);

    assert.strictEqual(parsed.version, 1);
    assert.strictEqual(parsed.habits.length, 3);
    assert.ok(Array.isArray(parsed.completions));
  });
});

// ── Validation / Security ──────────────────────────────

describe('security hardening', () => {
  it('filters out invalid habits from corrupted localStorage', () => {
    const stored = {
      version: 1,
      habits: [
        { id: 'good', name: 'Good Habit', frequency: 'daily', deadlineDay: null, createdAt: '2025-01-01' },
        { id: '', name: 'Missing id', frequency: 'daily' }, // invalid: empty id
        { name: 'Missing frequency', frequency: 'unknown' }, // invalid: bad frequency
        { id: 'x', name: '', frequency: 'daily' }, // invalid: empty name
        { id: 'x', name: 'a'.repeat(200), frequency: 'daily' }, // invalid: too long
      ],
      completions: [],
    };
    store.set('habit-tracker:data', JSON.stringify(stored));

    const data = load();
    assert.strictEqual(data.habits.length, 1, 'only valid habit should remain');
    assert.strictEqual(data.habits[0].name, 'Good Habit');
  });

  it('strips control characters from habit names', () => {
    load();
    const habit = saveHabit({
      name: 'Test\x00\x01\x02\x03Habit',
      frequency: 'daily',
    });

    assert.strictEqual(habit.name, 'TestHabit', 'control chars should be removed');
  });

  it('caps name length at 100 characters', () => {
    load();
    const longName = 'a'.repeat(200);
    const habit = saveHabit({ name: longName, frequency: 'daily' });

    assert.strictEqual(habit.name.length, 100);
  });

  it('rejects XSS payloads in habit names safely', () => {
    load();
    const habit = saveHabit({
      name: '<img src=x onerror=alert(1)>',
      frequency: 'daily',
    });

    // Should be stored as literal text (no sanitization of < > needed for storage,
    // but DOM uses textContent so it's safe)
    assert.strictEqual(habit.name, '<img src=x onerror=alert(1)>');
  });

  it('filters out invalid completions', () => {
    const stored = {
      version: 1,
      habits: [{ id: 'h-1', name: 'Test', frequency: 'daily', deadlineDay: null, createdAt: '2025-01-01' }],
      completions: [
        { id: 'c1', habitId: 'h-1', periodStart: '2025-01-01', periodEnd: '2025-01-01', completedAt: '2025-01-01' },
        { id: '', habitId: 'h-1' }, // invalid: missing fields
        { id: 'c3', habitId: 'h-1', periodStart: '2025-01-02', periodEnd: '2025-01-02', completedAt: '2025-01-02' },
      ],
    };
    store.set('habit-tracker:data', JSON.stringify(stored));

    const data = load();
    assert.strictEqual(data.completions.length, 2, 'only valid completions should remain');
  });

  it('resets to defaults when ALL habits are invalid', () => {
    const stored = {
      version: 1,
      habits: [
        { name: 'Bad', frequency: 'unknown' }, // invalid frequency
      ],
      completions: [],
    };
    store.set('habit-tracker:data', JSON.stringify(stored));

    const data = load();
    assert.strictEqual(data.habits.length, 3, 'should reset to defaults');
    assert.strictEqual(data.habits[0].name, 'Improve knowledge base');
  });

  it('throws on saveHabit with invalid data', () => {
    load();
    assert.throws(() => saveHabit({ name: '', frequency: 'daily' }), /Invalid habit/);
    assert.throws(() => saveHabit({ name: 'Test', frequency: 'unknown' }), /Invalid habit/);
  });

  it('throws on saveCompletion with invalid data', () => {
    load();
    assert.throws(() => saveCompletion({ habitId: 'x' }), /Invalid completion/);
  });

  it('caps completions array to MAX_COMPLETIONS', () => {
    const habits = [{ id: 'h-1', name: 'Test', frequency: 'daily', deadlineDay: null, createdAt: '2025-01-01' }];
    const completions = [];
    for (let i = 0; i < 5010; i++) {
      completions.push({
        id: `c-${i}`,
        habitId: 'h-1',
        periodStart: `2025-01-${(i % 30) + 1}T00:00:00`,
        periodEnd: `2025-01-${(i % 30) + 1}T23:59:59`,
        completedAt: `2025-01-${(i % 30) + 1}T12:00:00`,
      });
    }
    store.set('habit-tracker:data', JSON.stringify({ version: 1, habits, completions }));

    const data = load();
    assert.strictEqual(data.completions.length, 5000, 'completions should be capped');
  });
});
