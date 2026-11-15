// Pure functions for Streaks & Achievements (no database here, so they are easy to test).
import { dailyStats } from './streak.js';

// Every achievement: which number it watches (metric) and the value that unlocks it (target).
// Achievements in the same group are milestones of the same thing, from easy to hard.
export const RULES = [
  { key: 'tasks-1', group: 'Tasks', title: 'First step', description: 'Complete your first task', metric: 'tasksCompleted', target: 1 },
  { key: 'tasks-10', group: 'Tasks', title: 'Getting things done', description: 'Complete 10 tasks', metric: 'tasksCompleted', target: 10 },
  { key: 'tasks-50', group: 'Tasks', title: 'Task machine', description: 'Complete 50 tasks', metric: 'tasksCompleted', target: 50 },
  { key: 'tasks-100', group: 'Tasks', title: 'Centurion', description: 'Complete 100 tasks', metric: 'tasksCompleted', target: 100 },
  { key: 'task-streak-3', group: 'Task streak', title: 'Three in a row', description: 'Complete a task 3 days in a row', metric: 'taskStreak', target: 3 },
  { key: 'task-streak-7', group: 'Task streak', title: 'Full week', description: 'Complete a task 7 days in a row', metric: 'taskStreak', target: 7 },
  { key: 'task-streak-30', group: 'Task streak', title: 'Unstoppable', description: 'Complete a task 30 days in a row', metric: 'taskStreak', target: 30 },
  { key: 'focus-1', group: 'Focus', title: 'Deep breath', description: 'Finish your first focus session', metric: 'focusSessions', target: 1 },
  { key: 'focus-10', group: 'Focus', title: 'In the zone', description: 'Finish 10 focus sessions', metric: 'focusSessions', target: 10 },
  { key: 'focus-50', group: 'Focus', title: 'Monk mode', description: 'Finish 50 focus sessions', metric: 'focusSessions', target: 50 },
  { key: 'focus-600', group: 'Focus', title: 'Ten hours', description: 'Focus for 600 minutes in total', metric: 'focusMinutes', target: 600 },
  { key: 'focus-streak-3', group: 'Focus streak', title: 'Warm up', description: 'Focus 3 days in a row', metric: 'focusStreak', target: 3 },
  { key: 'focus-streak-7', group: 'Focus streak', title: 'Seven day focus', description: 'Focus 7 days in a row', metric: 'focusStreak', target: 7 },
  { key: 'habit-1', group: 'Habits', title: 'Day one', description: 'Tick a habit for the first time', metric: 'habitCheckins', target: 1 },
  { key: 'habit-30', group: 'Habits', title: 'Building up', description: 'Tick habits 30 times', metric: 'habitCheckins', target: 30 },
  { key: 'habit-100', group: 'Habits', title: 'Second nature', description: 'Tick habits 100 times', metric: 'habitCheckins', target: 100 },
  { key: 'habit-streak-7', group: 'Habit streak', title: 'One week strong', description: 'Keep a habit streak of 7 days', metric: 'habitStreak', target: 7 },
  { key: 'habit-streak-30', group: 'Habit streak', title: 'Thirty days', description: 'Keep a habit streak of 30 days', metric: 'habitStreak', target: 30 },
  { key: 'goal-1', group: 'Goals', title: 'Goal getter', description: 'Complete your first goal', metric: 'goalsCompleted', target: 1 },
  { key: 'goal-5', group: 'Goals', title: 'High achiever', description: 'Complete 5 goals', metric: 'goalsCompleted', target: 5 },
];

// A streak counts the days in a row on which something was done. Today may still be open.
// dates = ["YYYY-MM-DD", ...] -> { current, best }
export function streakOf(dates, today) {
  if (!dates.length) return { current: 0, best: 0 };
  const { current, best } = dailyStats(dates, today, today);
  return { current, best };
}

// input = { taskDates, focusDates, focusMinutes, habitDates, goalsCompleted }
export function buildMetrics(input, today) {
  const streaks = {
    tasks: streakOf(input.taskDates, today),
    focus: streakOf(input.focusDates, today),
    habits: streakOf(input.habitDates, today),
  };
  const metrics = {
    tasksCompleted: input.taskDates.length,
    taskStreak: streaks.tasks.best,
    focusSessions: input.focusDates.length,
    focusMinutes: input.focusMinutes,
    focusStreak: streaks.focus.best,
    habitCheckins: input.habitDates.length,
    habitStreak: streaks.habits.best,
    goalsCompleted: input.goalsCompleted,
  };
  return { streaks, metrics };
}

// unlockedDates = { key: Date } for the achievements already saved in the database
export function evaluate(metrics, unlockedDates = {}) {
  return RULES.map((rule) => {
    const value = metrics[rule.metric] || 0;
    const saved = unlockedDates[rule.key] || null;
    return {
      key: rule.key,
      group: rule.group,
      title: rule.title,
      description: rule.description,
      target: rule.target,
      progress: Math.min(value, rule.target),
      reached: value >= rule.target, // true right now
      unlocked: Boolean(saved) || value >= rule.target, // once unlocked it stays unlocked
      unlockedAt: saved,
    };
  });
}
