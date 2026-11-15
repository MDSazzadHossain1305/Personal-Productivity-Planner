// The productivity score (0 to 100) used by the dashboard and by analytics.
// It compares what the user did with the daily goals from Settings:
//   tasks finished  -> 40 points
//   focus minutes   -> 30 points
//   daily habits    -> 30 points (left out when the user has no daily habits)
import { dayNumber } from './dates.js';

const part = (done, target) => (target > 0 ? Math.min(1, done / target) : 0);

// done = { tasks, focusMinutes, habitsDone, habitsDue }, days = number of days the numbers cover
export function productivityScore(done, settings, days = 1) {
  const tasks = part(done.tasks, (settings?.dailyTaskGoal || 3) * days);
  const focus = part(done.focusMinutes, (settings?.dailyFocusGoal || 50) * days);
  const hasHabits = done.habitsDue > 0;
  const habits = hasHabits ? part(done.habitsDone, done.habitsDue) : 0;
  const total = hasHabits ? tasks * 40 + focus * 30 + habits * 30 : ((tasks * 40 + focus * 30) / 70) * 100;
  return {
    score: Math.round(total),
    tasks: Math.round(tasks * 100),
    focus: Math.round(focus * 100),
    habits: hasHabits ? Math.round(habits * 100) : null,
  };
}

// Daily habits between two dates (inclusive): how many check-ins were possible and how many were made.
// habits = [{ frequency, created: "YYYY-MM-DD", completions: ["YYYY-MM-DD", ...] }]
export function habitLoad(habits, from, to) {
  let due = 0;
  let done = 0;
  for (const h of habits) {
    if (h.frequency !== 'daily') continue;
    const first = [h.created, ...h.completions].sort()[0]; // a day ticked before the habit was created still counts
    const start = first > from ? first : from;
    if (start <= to) due += dayNumber(to) - dayNumber(start) + 1;
    done += new Set(h.completions.filter((d) => d >= from && d <= to)).size;
  }
  return { habitsDue: due, habitsDone: done };
}
