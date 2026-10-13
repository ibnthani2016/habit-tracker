/**
 * Habit Tracker App
 * Ties storage, streaks, and DOM together.
 * Pure DOM manipulation — no framework.
 * Accessibility: targeted updates preserve focus, ARIA live announces changes.
 */

import { load, saveHabit, saveCompletion, removeCompletion, getCompletionForPeriod, clearAll, exportData } from './storage.js';
import { calculateStreak } from './streaks.js';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, addDays, isSameDay, isSameWeek } from './utils/date.js';

// ── Constants ──────────────────────────────────────────────

const HABIT_LIST_ID = 'habit-list';
const STATS_DISPLAY_ID = 'stats-display';
const STATUS_LIVE_ID = 'status-live';
const EXPORT_BTN_ID = 'export-btn';
const RESET_BTN_ID = 'reset-btn';
const VIEW_DASHBOARD_BTN_ID = 'view-dashboard-btn';
const VIEW_WEEKLY_BTN_ID = 'view-weekly-btn';
const DASHBOARD_VIEW_ID = 'dashboard-view';
const WEEKLY_REVIEW_VIEW_ID = 'weekly-review-view';
const WEEKLY_REVIEW_GRID_ID = 'weekly-review-grid';
const ADD_HABIT_TOGGLE_ID = 'add-habit-toggle';
const ADD_HABIT_SECTION_ID = 'add-habit-section';
const ADD_HABIT_FORM_ID = 'add-habit-form';
const HABIT_NAME_INPUT_ID = 'habit-name';
const FREQUENCY_SELECT_ID = 'habit-frequency';
const DEADLINE_DAY_FIELD_ID = 'deadline-day-field';
const DEADLINE_DAY_SELECT_ID = 'habit-deadline-day';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  renderWeeklyReview();

  document.getElementById(EXPORT_BTN_ID)?.addEventListener('click', handleExport);
  document.getElementById(RESET_BTN_ID)?.addEventListener('click', handleReset);

  initViewSwitching();
  initAddHabitForm();
}

// ── View Switching ───────────────────────────────────────

function initViewSwitching() {
  const dashboardBtn = document.getElementById(VIEW_DASHBOARD_BTN_ID);
  const weeklyBtn = document.getElementById(VIEW_WEEKLY_BTN_ID);
  const dashboardView = document.getElementById(DASHBOARD_VIEW_ID);
  const weeklyView = document.getElementById(WEEKLY_REVIEW_VIEW_ID);

  if (!dashboardBtn || !weeklyBtn || !dashboardView || !weeklyView) return;

  function showDashboard() {
    dashboardView.hidden = false;
    weeklyView.hidden = true;
    dashboardBtn.classList.add('view-btn--active');
    dashboardBtn.setAttribute('aria-pressed', 'true');
    weeklyBtn.classList.remove('view-btn--active');
    weeklyBtn.setAttribute('aria-pressed', 'false');
    announce('Dashboard view');
  }

  function showWeekly() {
    dashboardView.hidden = true;
    weeklyView.hidden = false;
    dashboardBtn.classList.remove('view-btn--active');
    dashboardBtn.setAttribute('aria-pressed', 'false');
    weeklyBtn.classList.add('view-btn--active');
    weeklyBtn.setAttribute('aria-pressed', 'true');
    renderWeeklyReview();
    announce('Weekly review view');
  }

  dashboardBtn.addEventListener('click', showDashboard);
  weeklyBtn.addEventListener('click', showWeekly);
}

// ── Weekly Review ────────────────────────────────────────

function renderWeeklyReview() {
  const grid = document.getElementById(WEEKLY_REVIEW_GRID_ID);
  if (!grid) return;

  const ref = new Date();
  const { habits, completions } = load();
  const dailyHabits = habits.filter(h => h.frequency === 'daily');
  const weeklyHabits = habits.filter(h => h.frequency === 'weekly');

  const days = Array.from({ length: 7 }, (_, i) => addDays(ref, -6 + i));

  const table = document.createElement('table');
  table.className = 'review-table';

  // Header row
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.appendChild(document.createElement('th')); // habit name column
  days.forEach(day => {
    const th = document.createElement('th');
    th.innerHTML = `<span>${DAY_NAMES[day.getDay()]}</span><span class="day-label">${day.getDate()}</span>`;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Daily habit rows
  const tbody = document.createElement('tbody');
  dailyHabits.forEach(habit => {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    nameCell.textContent = habit.name;
    row.appendChild(nameCell);

    days.forEach(day => {
      const cell = document.createElement('td');
      const completed = completions.some(c =>
        c.habitId === habit.id && isSameDay(c.periodStart, day)
      );
      cell.innerHTML = completed
        ? '<span class="check" aria-label="Done">✓</span>'
        : '<span class="miss" aria-hidden="true">—</span>';
      cell.setAttribute('aria-label', `${habit.name} on ${day.toLocaleDateString()}: ${completed ? 'done' : 'not done'}`);
      row.appendChild(cell);
    });

    tbody.appendChild(row);
  });

  // Weekly habit rows
  weeklyHabits.forEach(habit => {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    nameCell.textContent = habit.name;
    row.appendChild(nameCell);

    const completed = completions.some(c =>
      c.habitId === habit.id && isSameWeek(c.periodStart, ref)
    );

    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.innerHTML = completed
      ? '<span class="check" aria-label="Done">✓</span> This week'
      : '<span class="miss" aria-hidden="true">—</span> This week';
    cell.setAttribute('aria-label', `${habit.name} this week: ${completed ? 'done' : 'not done'}`);
    row.appendChild(cell);

    tbody.appendChild(row);
  });

  if (dailyHabits.length === 0 && weeklyHabits.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 8;
    cell.textContent = 'No habits to review.';
    cell.className = 'empty-state';
    row.appendChild(cell);
    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  grid.innerHTML = '';
  grid.appendChild(table);
}

// ── Add Habit Form ───────────────────────────────────────

function initAddHabitForm() {
  const toggleBtn = document.getElementById(ADD_HABIT_TOGGLE_ID);
  const section = document.getElementById(ADD_HABIT_SECTION_ID);
  const form = document.getElementById(ADD_HABIT_FORM_ID);
  const nameInput = document.getElementById(HABIT_NAME_INPUT_ID);
  const frequencySelect = document.getElementById(FREQUENCY_SELECT_ID);
  const deadlineDayField = document.getElementById(DEADLINE_DAY_FIELD_ID);

  if (!toggleBtn || !section || !form || !frequencySelect || !deadlineDayField) return;

  function updateDeadlineDayVisibility() {
    const isWeekly = frequencySelect.value === 'weekly';
    deadlineDayField.hidden = !isWeekly;
  }

  function openForm() {
    section.hidden = false;
    toggleBtn.setAttribute('aria-expanded', 'true');
    nameInput?.focus();
  }

  function closeForm() {
    section.hidden = true;
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.focus();
  }

  toggleBtn.addEventListener('click', () => {
    if (section.hidden) {
      openForm();
    } else {
      closeForm();
    }
  });

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
      nameInput?.focus();
      return;
    }

    try {
      saveHabit({ name, frequency, deadlineDay });
      announce(`Habit "${name}" added.`);
      form.reset();
      updateDeadlineDayVisibility();
      render();
      closeForm();
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
