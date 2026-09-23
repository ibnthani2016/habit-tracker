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

// ── Validation helpers ─────────────────────────────────────

const MAX_NAME_LENGTH = 100;
const MAX_COMPLETIONS = 5000;

function stripControlChars(str) {
  // Remove control characters except tab, newline, carriage return
  return str.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
}

function isValidHabit(h) {
  if (!h || typeof h !== 'object') return false;
  if (typeof h.id !== 'string' || h.id.length === 0) return false;
  if (typeof h.name !== 'string' || h.name.length === 0) return false;
  if (h.name.length > MAX_NAME_LENGTH) return false;
  if (h.frequency !== 'daily' && h.frequency !== 'weekly') return false;
  if (h.deadlineDay !== null && (typeof h.deadlineDay !== 'number' || h.deadlineDay < 0 || h.deadlineDay > 6)) {
    return false;
  }
  return true;
}

function isValidCompletion(c) {
  if (!c || typeof c !== 'object') return false;
  if (typeof c.id !== 'string' || c.id.length === 0) return false;
  if (typeof c.habitId !== 'string' || c.habitId.length === 0) return false;
  if (typeof c.periodStart !== 'string') return false;
  if (typeof c.periodEnd !== 'string') return false;
  if (typeof c.completedAt !== 'string') return false;
  return true;
}

function sanitizeHabit(h) {
  return {
    id: String(h.id || generateId()),
    name: stripControlChars(String(h.name).slice(0, MAX_NAME_LENGTH)),
    frequency: h.frequency === 'weekly' ? 'weekly' : 'daily',
    deadlineDay: h.deadlineDay === null ? null : Math.max(0, Math.min(6, Number(h.deadlineDay) || 0)),
    createdAt: typeof h.createdAt === 'string' ? h.createdAt : new Date().toISOString(),
  };
}

function sanitizeCompletion(c) {
  return {
    id: String(c.id || generateId()),
    habitId: String(c.habitId),
    periodStart: String(c.periodStart),
    periodEnd: String(c.periodEnd),
    completedAt: String(c.completedAt),
  };
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

  const rawHabits = Array.isArray(parsed.habits) ? parsed.habits : [];
  const rawCompletions = Array.isArray(parsed.completions) ? parsed.completions : [];

  const habits = rawHabits.filter(isValidHabit).map(sanitizeHabit);
  const completions = rawCompletions.filter(isValidCompletion).map(sanitizeCompletion);

  // Cap completions to prevent unbounded growth
  const trimmedCompletions = completions.length > MAX_COMPLETIONS
    ? completions.slice(-MAX_COMPLETIONS)
    : completions;

  // If all habits were invalid, reset to defaults
  if (habits.length === 0) {
    console.warn('No valid habits found in stored data. Resetting to defaults.');
    const defaults = {
      version: CURRENT_VERSION,
      habits: [...DEFAULT_HABITS],
      completions: trimmedCompletions,
    };
    persist(defaults);
    return defaults;
  }

  return {
    version: parsed.version,
    habits,
    completions: trimmedCompletions,
  };
}

/**
 * Save a new habit. Assigns id and createdAt if missing.
 */
export function saveHabit(habit) {
  const candidate = {
    id: habit.id || generateId(),
    name: stripControlChars(String(habit.name).slice(0, MAX_NAME_LENGTH)),
    frequency: habit.frequency,
    deadlineDay: habit.deadlineDay ?? null,
    createdAt: habit.createdAt || new Date().toISOString(),
  };

  if (!isValidHabit(candidate)) {
    throw new Error(`Invalid habit: name must be 1-${MAX_NAME_LENGTH} chars, frequency must be daily or weekly`);
  }

  const data = load();
  const newHabit = sanitizeHabit(candidate);
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
  const candidate = {
    id: completion.id || generateId(),
    habitId: completion.habitId,
    completedAt: completion.completedAt,
    periodStart: completion.periodStart,
    periodEnd: completion.periodEnd,
  };

  if (!isValidCompletion(candidate)) {
    throw new Error('Invalid completion: all fields required');
  }

  const data = load();
  const newCompletion = sanitizeCompletion(candidate);

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
