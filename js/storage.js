/**
 * Storage module — single source of truth for localStorage.
 * All reads/writes go through here. No other code touches localStorage.
 *
 * Contract: see storage-contract.md
 */

const STORAGE_KEY = 'habit-tracker:data';
const CURRENT_VERSION = 1;

const DEFAULT_HABITS = [
  { id: 'h-1', name: 'Improve knowledge base', frequency: 'daily', deadlineDay: null, createdAt: '2025-01-01T00:00:00' },
  { id: 'h-2', name: 'Keep health routine', frequency: 'daily', deadlineDay: null, createdAt: '2025-01-01T00:00:00' },
  { id: 'h-3', name: 'Start or complete a project', frequency: 'weekly', deadlineDay: 0, createdAt: '2025-01-01T00:00:00' },
];

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function persist(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      throw new Error('Storage quota exceeded. Export your data before continuing.');
    }
    throw e;
  }
}

/**
 * Load data from localStorage. Returns normalized state.
 */
export function load() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    const defaults = {
      version: CURRENT_VERSION,
      habits: [...DEFAULT_HABITS],
      completions: [],
    };
    persist(defaults);
    return defaults;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn('Corrupt habit-tracker data. Resetting to defaults.');
    const defaults = {
      version: CURRENT_VERSION,
      habits: [...DEFAULT_HABITS],
      completions: [],
    };
    persist(defaults);
    return defaults;
  }

  if (typeof parsed.version !== 'number') {
    console.warn('Outdated habit-tracker data (no version). Resetting to defaults.');
    const defaults = {
      version: CURRENT_VERSION,
      habits: [...DEFAULT_HABITS],
      completions: [],
    };
    persist(defaults);
    return defaults;
  }

  if (parsed.version !== CURRENT_VERSION) {
    console.warn(`Unsupported habit-tracker version ${parsed.version}. Resetting to defaults.`);
    const defaults = {
      version: CURRENT_VERSION,
      habits: [...DEFAULT_HABITS],
      completions: [],
    };
    persist(defaults);
    return defaults;
  }

  return {
    version: parsed.version,
    habits: Array.isArray(parsed.habits) ? parsed.habits : [],
    completions: Array.isArray(parsed.completions) ? parsed.completions : [],
  };
}

/**
 * Save a new habit. Assigns id and createdAt if missing.
 */
export function saveHabit(habit) {
  const data = load();
  const newHabit = {
    id: habit.id || generateId(),
    name: habit.name,
    frequency: habit.frequency,
    deadlineDay: habit.deadlineDay ?? null,
    createdAt: habit.createdAt || new Date().toISOString(),
  };
  data.habits.push(newHabit);
  persist(data);
  return newHabit;
}

/**
 * Remove a habit and all its completions.
 */
export function removeHabit(id) {
  const data = load();
  const initialLen = data.habits.length;
  data.habits = data.habits.filter(h => h.id !== id);
  data.completions = data.completions.filter(c => c.habitId !== id);
  persist(data);
  return data.habits.length < initialLen;
}

/**
 * Save a completion. Replaces existing completion for same habit+period.
 */
export function saveCompletion(completion) {
  const data = load();
  const newCompletion = {
    id: completion.id || generateId(),
    habitId: completion.habitId,
    completedAt: completion.completedAt,
    periodStart: completion.periodStart,
    periodEnd: completion.periodEnd,
  };

  // Deduplicate: replace same habit+period
  const existingIndex = data.completions.findIndex(
    c => c.habitId === newCompletion.habitId && c.periodStart === newCompletion.periodStart
  );

  if (existingIndex >= 0) {
    data.completions[existingIndex] = newCompletion;
  } else {
    data.completions.push(newCompletion);
  }

  persist(data);
  return newCompletion;
}

/**
 * Remove a completion by habitId + periodStart.
 */
export function removeCompletion(habitId, periodStart) {
  const data = load();
  const initialLen = data.completions.length;
  data.completions = data.completions.filter(
    c => !(c.habitId === habitId && c.periodStart === periodStart)
  );
  persist(data);
  return data.completions.length < initialLen;
}

/**
 * Get a single completion for a habit+period, or null.
 */
export function getCompletionForPeriod(habitId, periodStart) {
  const data = load();
  return data.completions.find(
    c => c.habitId === habitId && c.periodStart === periodStart
  ) || null;
}

/**
 * Wipe all data. Next load() will re-seed defaults.
 */
export function clearAll() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Export raw data as a JSON string.
 */
export function exportData() {
  const data = load();
  return JSON.stringify(data, null, 2);
}
