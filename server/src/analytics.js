// Pure functions for Productivity Analytics (no database here, so they are easy to test).
import { addDays, dayNumber, iso, parse } from './dates.js';
import { habitLoad, productivityScore } from './scoring.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayLabel = (s) => `${parse(s).getDate()} ${MONTHS[parse(s).getMonth()]}`;

export const PERIODS = { daily: 14, weekly: 8, monthly: 6 }; // how many bars each view shows

// first day of the week that contains date s
export function weekStart(s, weekStartsOn = 'sunday') {
  const day = parse(s).getDay(); // 0 = Sunday
  const back = weekStartsOn === 'monday' ? (day + 6) % 7 : day;
  return addDays(s, -back);
}

// The time ranges to report on, oldest first. The last one is the current day, week or month.
export function makeBuckets(period, today, weekStartsOn = 'sunday') {
  const count = PERIODS[period] || PERIODS.daily;
  const list = [];
  if (period === 'weekly') {
    const start = weekStart(today, weekStartsOn);
    for (let i = count - 1; i >= 0; i -= 1) {
      const from = addDays(start, -7 * i);
      list.push({ from, to: addDays(from, 6), label: dayLabel(from) });
    }
  } else if (period === 'monthly') {
    const t = parse(today);
    for (let i = count - 1; i >= 0; i -= 1) {
      const first = new Date(t.getFullYear(), t.getMonth() - i, 1);
      const last = new Date(t.getFullYear(), t.getMonth() - i + 1, 0);
      list.push({ from: iso(first), to: iso(last), label: `${MONTHS[first.getMonth()]} ${first.getFullYear()}` });
    }
  } else {
    for (let i = count - 1; i >= 0; i -= 1) {
      const d = addDays(today, -i);
      list.push({ from: d, to: d, label: dayLabel(d) });
    }
  }
  return list;
}

// data = { taskDates: ["YYYY-MM-DD"], focus: [{ date, minutes, completed }], habits: [{ frequency, created, completions }] }
export function summarise(bucket, data, settings, today) {
  const { from } = bucket;
  const to = bucket.to > today ? today : bucket.to; // do not count days that have not happened yet
  const inRange = (d) => d >= from && d <= to;
  const days = dayNumber(to) - dayNumber(from) + 1;

  const tasksCompleted = data.taskDates.filter(inRange).length;
  const sessions = data.focus.filter((f) => inRange(f.date));
  const focusMinutes = sessions.reduce((sum, f) => sum + f.minutes, 0);
  const focusSessions = sessions.filter((f) => f.completed).length;
  const habitCheckins = data.habits.reduce((sum, h) => sum + new Set(h.completions.filter(inRange)).size, 0);
  const load = habitLoad(data.habits, from, to);
  const { score } = productivityScore({ tasks: tasksCompleted, focusMinutes, ...load }, settings, days);

  return { ...bucket, days, tasksCompleted, focusMinutes, focusSessions, habitCheckins, score };
}

// percentage change from a to b; null when there is nothing to compare with
export const change = (a, b) => (a === 0 ? (b === 0 ? 0 : null) : Math.round(((b - a) / a) * 100));

export function buildReport(period, data, settings, today) {
  const buckets = makeBuckets(period, today, settings?.weekStartsOn).map((b) => summarise(b, data, settings, today));
  const current = buckets[buckets.length - 1];
  const previous = buckets[buckets.length - 2];
  const metrics = ['score', 'tasksCompleted', 'focusMinutes', 'habitCheckins'];
  const totals = {};
  const changes = {};
  for (const m of metrics) {
    totals[m] = buckets.reduce((sum, b) => sum + b[m], 0);
    changes[m] = change(previous[m], current[m]);
  }
  totals.score = Math.round(totals.score / buckets.length); // for the score an average makes more sense than a sum
  const best = buckets.reduce((top, b) => (b.score > top.score ? b : top), buckets[0]);
  return { period, buckets, current, previous, changes, totals, best: { label: best.label, score: best.score } };
}
