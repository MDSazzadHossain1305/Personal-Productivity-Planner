import { addDays, dayNumber, mondayOf } from './dates.js';

// longest run of numbers that go up by exactly `step` (input sorted, unique)
function longestRun(nums, step) {
  let best = 0;
  let cur = 0;
  let prev = null;
  for (const n of nums) {
    cur = prev !== null && n - prev === step ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = n;
  }
  return best;
}

const uniqueSorted = (arr) => [...new Set(arr)].sort((a, b) => a - b);

// Daily habit: streak = consecutive days. If today is not done yet, the streak is still alive until midnight.
export function dailyStats(dates, today, since) {
  const set = new Set(dates);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (set.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  const best = longestRun(uniqueSorted(dates.map(dayNumber)), 1);
  const span = Math.min(30, Math.max(1, dayNumber(today) - dayNumber(since) + 1));
  let hit = 0;
  for (let i = 0; i < span; i += 1) if (set.has(addDays(today, -i))) hit += 1;
  return { current, best, consistency: Math.round((hit / span) * 100) };
}

// Weekly habit: a week (Monday to Sunday) counts when it has at least one completion.
export function weeklyStats(dates, today, since) {
  const weeks = new Set(dates.map(mondayOf));
  const thisWeek = mondayOf(today);
  let cursor = weeks.has(thisWeek) ? thisWeek : addDays(thisWeek, -7);
  let current = 0;
  while (weeks.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -7);
  }
  const best = longestRun(uniqueSorted([...weeks].map(dayNumber)), 7);
  const span = Math.min(8, Math.max(1, Math.floor((dayNumber(thisWeek) - dayNumber(mondayOf(since))) / 7) + 1));
  let hit = 0;
  for (let i = 0; i < span; i += 1) if (weeks.has(addDays(thisWeek, -7 * i))) hit += 1;
  return { current, best, consistency: Math.round((hit / span) * 100) };
}
