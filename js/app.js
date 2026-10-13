/**
 * Habit Tracker App
 * Ties storage, streaks, and DOM together.
 * Pure DOM manipulation — no framework.
 * Accessibility: targeted updates preserve focus, ARIA live announces changes.
 */

import { load, saveHabit, saveCompletion, removeCompletion, getCompletionForPeriod, clearAll, exportData } from './storage.js';
import { calculateStreak } from './streaks.js';
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from './utils/date.js';

// ── Constants ──────────────────────────────────────────────

const HABIT_LIST_ID = 'habit-list';
const STATS_DISPLAY_ID = 'stats-display';
const STATUS_LIVE_ID = 'status-live';
const EXPORT_BTN_ID = 'export-btn';
const RESET_BTN_ID = 'reset-btn';
const ADD_HABIT_FORM_ID = 'add-habit-form';
const FREQUENCY_SELECT_ID = 'habit-frequency';
const DEADLINE_DAY_FIELD_ID = 'deadline-day-field';
const DEADLINE_DAY_SELECT_ID = 'habit-deadline-day';

// ── Helpers ────────────────────────────────────────────────

function getHabitState(habit, allCompletions, referenceDate) {
  const streak = calculateStreak(habit, allCompletions, referenceDate);
  const isDaily = habit.frequency === 'daily';
  const currentPeriodStart = isDaily
    ? startOfDay(referenceDate).toISOString()
    : startOfWeek(referenceDate).toISOString();
  const isDone = !!getCompletionForPeriod(habit.id, currentPeriodStart);

  return {
    ...habit,
    currentStreak: streak.currentStreak,
    bestStreak: streak.bestStreak,
    status: streak.status,
    isDone,
    currentPeriodStart,
  };
}

function getAllState(referenceDate) {
  const { habits, completions } = load();
  const habitsWithStreaks = habits.map(h => getHabitState(h, completions, referenceDate));
  const overallBest = habitsWithStreaks.length > 0
    ? Math.max(0, ...habitsWithStreaks.map(h => h.bestStreak))
    : 0;
  const activeCount = habitsWithStreaks.filter(h => h.status === 'active').length;
  return { habits: habitsWithStreaks, overallBest, activeCount, rawCompletions: completions };
}

// ── Render (initial build) ─────────────────────────────────

function render() {
  const ref = new Date();
  const { habits, overallBest, activeCount } = getAllState(ref);
  const listEl = document.getElementById(HABIT_LIST_ID);
  const statsEl = document.getElementById(STATS_DISPLAY_ID);

  listEl.innerHTML = '';
  habits.forEach(habit => {
    const card = createHabitCard(habit);
    card.dataset.habitId = habit.id;
    listEl.appendChild(card);
  });

  statsEl.innerHTML = '';
  statsEl.appendChild(createStatItem('stat-habits', habits.length, 'Habits'));
  statsEl.appendChild(createStatItem('stat-active', activeCount, 'Active'));
  statsEl.appendChild(createStatItem('stat-best', overallBest, 'Best Streak'));
}

function createHabitCard(habit) {
  const li = document.createElement('li');
  li.className = `habit-card habit-card--${habit.status}`;

  const checkboxId = `habit-check-${habit.id}`;

  // ── Toggle / Checkbox ──
  const toggleDiv = document.createElement('div');
  toggleDiv.className = 'habit-toggle';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = checkboxId;
  checkbox.checked = habit.isDone;
  checkbox.setAttribute('aria-label', `${habit.isDone ? 'Unmark' : 'Mark'} ${habit.name} as ${habit.frequency === 'daily' ? 'done today' : 'done this week'}`);

  const visual = document.createElement('span');
  visual.className = 'toggle-visual';
  visual.setAttribute('aria-hidden', 'true');

  toggleDiv.appendChild(checkbox);
  toggleDiv.appendChild(visual);

  // ── Info ──
  const infoDiv = document.createElement('div');
  infoDiv.className = 'habit-info';

  const nameEl = document.createElement('div');
  nameEl.className = 'habit-name';
  nameEl.textContent = habit.name;

  const metaEl = document.createElement('div');
  metaEl.className = 'habit-meta';
  metaEl.textContent = `${habit.frequency}${habit.status === 'broken' ? ' • streak broken' : ''}`;

  infoDiv.appendChild(nameEl);
  infoDiv.appendChild(metaEl);

  // ── Streak Badge ──
  const badge = document.createElement('div');
  badge.className = `streak-badge streak-badge--${habit.status}`;
  badge.setAttribute('aria-label', `Current streak: ${habit.currentStreak}. Best streak: ${habit.bestStreak}.`);

  const icon = document.createElement('span');
  icon.className = 'streak-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = habit.status === 'active' ? '🔥' : '💔';

  const count = document.createElement('span');
  count.className = 'streak-count';
  count.textContent = habit.currentStreak;

  const label = document.createElement('span');
  label.className = 'streak-label';
  label.textContent = 'streak';

  badge.appendChild(icon);
  badge.appendChild(count);
  badge.appendChild(label);

  // ── Assemble ──
  li.appendChild(toggleDiv);
  li.appendChild(infoDiv);
  li.appendChild(badge);

  // ── Event ──
  checkbox.addEventListener('change', () => {
    handleToggle(habit, checkbox.checked, li);
  });

  return li;
}

function createStatItem(id, value, label) {
  const div = document.createElement('div');
  div.className = 'stat-item';

  const val = document.createElement('dt');
  val.id = id;
  val.className = 'stat-value';
  val.textContent = value;

  const lbl = document.createElement('dd');
  lbl.className = 'stat-label';
  lbl.textContent = label;

  div.appendChild(val);
  div.appendChild(lbl);

  return div;
}

// ── Targeted Update (preserves focus) ──────────────────────

function updateCard(card, habit) {
  card.className = `habit-card habit-card--${habit.status}`;

  const checkbox = card.querySelector('input[type="checkbox"]');
  if (checkbox) {
    checkbox.checked = habit.isDone;
    checkbox.setAttribute('aria-label', `${habit.isDone ? 'Unmark' : 'Mark'} ${habit.name} as ${habit.frequency === 'daily' ? 'done today' : 'done this week'}`);
  }

  const meta = card.querySelector('.habit-meta');
  if (meta) {
    meta.textContent = `${habit.frequency}${habit.status === 'broken' ? ' • streak broken' : ''}`;
  }

  const badge = card.querySelector('.streak-badge');
  if (badge) {
    badge.className = `streak-badge streak-badge--${habit.status}`;
    badge.setAttribute('aria-label', `Current streak: ${habit.currentStreak}. Best streak: ${habit.bestStreak}.`);

    const icon = badge.querySelector('.streak-icon');
    if (icon) icon.textContent = habit.status === 'active' ? '🔥' : '💔';

    const count = badge.querySelector('.streak-count');
    if (count) count.textContent = habit.currentStreak;
  }
}

function updateStats({ overallBest, activeCount }) {
  const statActive = document.getElementById('stat-active');
  const statBest = document.getElementById('stat-best');
  if (statActive) statActive.textContent = activeCount;
  if (statBest) statBest.textContent = overallBest;
}

// ── Actions ────────────────────────────────────────────────

function handleToggle(habit, isChecked, card) {
  const ref = new Date();

  if (isChecked) {
    const periodStart = habit.currentPeriodStart;
    const periodEnd = habit.frequency === 'daily'
      ? endOfDay(new Date(periodStart)).toISOString()
      : endOfWeek(new Date(periodStart)).toISOString();

    saveCompletion({
      habitId: habit.id,
      completedAt: ref.toISOString(),
      periodStart,
      periodEnd,
    });
    announce(`${habit.name} marked as done.`);
  } else {
    removeCompletion(habit.id, habit.currentPeriodStart);
    announce(`${habit.name} unmarked.`);
  }

  // Recompute with the SAME reference date to avoid drift
  const { habits, completions } = load();
  const freshHabit = habits.find(h => h.id === habit.id);
  if (!freshHabit) {
    // Habit was deleted — full re-render
    render();
    return;
  }
  const updated = getHabitState(freshHabit, completions, ref);

  updateCard(card, updated);

  // Update stats using the same reference date
  const allState = getAllState(ref);
  updateStats(allState);
}

function announce(message) {
  const el = document.getElementById(STATUS_LIVE_ID);
  if (el) {
    el.textContent = message;
    setTimeout(() => { el.textContent = ''; }, 1000);
  }
}

function handleExport() {
  const blob = exportData();
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `habit-tracker-backup-${dateStr}.json`;

  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([blob], { type: 'application/json' }));
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);

  announce('Data exported as JSON file.');
}

function handleReset() {
  const confirmed = window.confirm(
    'Delete all habit data and reset to defaults? This cannot be undone.'
  );
  if (!confirmed) return;

  clearAll();
  announce('All data cleared. Reset to defaults.');
  render();
}

// ── Init ─────────────────────────────────────────────────

function init() {
  render();

  document.getElementById(EXPORT_BTN_ID)?.addEventListener('click', handleExport);
  document.getElementById(RESET_BTN_ID)?.addEventListener('click', handleReset);

  initAddHabitForm();
}

// ── Add Habit Form ───────────────────────────────────────

function initAddHabitForm() {
  const form = document.getElementById(ADD_HABIT_FORM_ID);
  const frequencySelect = document.getElementById(FREQUENCY_SELECT_ID);
  const deadlineDayField = document.getElementById(DEADLINE_DAY_FIELD_ID);

  if (!form || !frequencySelect || !deadlineDayField) return;

  function updateDeadlineDayVisibility() {
    const isWeekly = frequencySelect.value === 'weekly';
    deadlineDayField.hidden = !isWeekly;
  }

  frequencySelect.addEventListener('change', updateDeadlineDayVisibility);
  updateDeadlineDayVisibility();

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = String(formData.get('name') || '').trim();
    const frequency = String(formData.get('frequency') || 'daily');
    const deadlineDayValue = formData.get('deadlineDay');
    const deadlineDay = frequency === 'weekly'
      ? Number(deadlineDayValue)
      : null;

    if (!name) {
      announce('Please enter a habit name.');
      form.querySelector('#habit-name')?.focus();
      return;
    }

    try {
      saveHabit({ name, frequency, deadlineDay });
      announce(`Habit "${name}" added.`);
      form.reset();
      updateDeadlineDayVisibility();
      render();
    } catch (err) {
      announce(err.message || 'Failed to add habit.');
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
