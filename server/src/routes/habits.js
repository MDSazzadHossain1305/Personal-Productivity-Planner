import { Router } from 'express';
import { Habit } from '../models2.js';
import { requireAuth } from '../auth.js';
import { addDays, dayNumber, isDate, iso, mondayOf, parse, todayISO } from '../dates.js';
import { dailyStats, weeklyStats } from '../streak.js';

const router = Router();
router.use(requireAuth);

// habit + streak, consistency and the history from the 1st of last month up to today
function out(habit) {
  const today = todayISO();
  const dates = habit.completions;
  const created = iso(habit.createdAt);
  const since = [created, ...dates].sort()[0];
  const stats = habit.frequency === 'weekly' ? weeklyStats(dates, today, since) : dailyStats(dates, today, since);
  const set = new Set(dates);
  const thisWeek = mondayOf(today);
  const doneNow =
    habit.frequency === 'weekly' ? dates.some((d) => mondayOf(d) === thisWeek) : set.has(today);
  // every day from the 1st of LAST month to today, so the page can show this month and last month
  const t = parse(today);
  const history = [];
  for (let d = iso(new Date(t.getFullYear(), t.getMonth() - 1, 1)); d <= today; d = addDays(d, 1)) {
    history.push({ date: d, done: set.has(d) });
  }
  return {
    ...habit.toJSON(),
    completions: undefined,
    streak: stats.current,
    bestStreak: stats.best,
    consistency: stats.consistency,
    doneNow, // done today (daily) or done this week (weekly)
    doneToday: set.has(today),
    totalCompletions: dates.length,
    history,
  };
}

async function findOwn(req, res) {
  const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.id });
  if (!habit) res.status(404).json({ message: 'Habit not found' });
  return habit;
}

// GET /api/habits?archived=true
router.get('/', async (req, res) => {
  const habits = await Habit.find({ userId: req.user.id, archived: req.query.archived === 'true' }).sort({ createdAt: 1 });
  res.json({ habits: habits.map(out) });
});

// POST /api/habits   body: { name, description, frequency }
router.post('/', async (req, res) => {
  const { name, description, frequency } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });
  if (frequency && !['daily', 'weekly'].includes(frequency)) return res.status(400).json({ message: 'Frequency must be daily or weekly' });
  const habit = await Habit.create({ userId: req.user.id, name, description: description || '', frequency: frequency || 'daily' });
  res.status(201).json({ habit: out(habit) });
});

// PUT /api/habits/:id   body: { name, description, frequency, days }
// days = the past days changed in the Edit window, e.g. { "2026-11-17": true, "2026-11-16": false }
// This is the ONLY way to change or remove a day that was already marked done.
router.put('/:id', async (req, res) => {
  const habit = await findOwn(req, res);
  if (!habit) return;
  const { name, description, frequency, days } = req.body;
  if (name !== undefined && !name.trim()) return res.status(400).json({ message: 'Name cannot be empty' });
  if (frequency !== undefined && !['daily', 'weekly'].includes(frequency)) {
    return res.status(400).json({ message: 'Frequency must be daily or weekly' });
  }
  if (days !== undefined) {
    if (typeof days !== 'object' || days === null || Array.isArray(days)) {
      return res.status(400).json({ message: 'days must be an object of date: true/false' });
    }
    const today = todayISO();
    for (const [date, done] of Object.entries(days)) {
      if (!isDate(date)) return res.status(400).json({ message: `Not a valid date: ${date}` });
      if (date > today) return res.status(400).json({ message: 'You cannot complete a habit in the future' });
      if (dayNumber(today) - dayNumber(date) > 62) return res.status(400).json({ message: 'Only this month and last month can be changed' });
      if (typeof done !== 'boolean') return res.status(400).json({ message: `Value for ${date} must be true or false` });
    }
  }

  if (name !== undefined) habit.name = name;
  if (description !== undefined) habit.description = description;
  if (frequency !== undefined) habit.frequency = frequency;
  if (days !== undefined) {
    const set = new Set(habit.completions);
    for (const [date, done] of Object.entries(days)) {
      if (done) set.add(date);
      else set.delete(date);
    }
    habit.completions = [...set].sort();
  }
  await habit.save();
  res.json({ habit: out(habit) });
});

// POST /api/habits/:id/complete
// Marks TODAY as done. It is permanent: pressing it again changes nothing.
// To change a day afterwards, the user must use Edit (PUT above).
router.post('/:id/complete', async (req, res) => {
  const habit = await findOwn(req, res);
  if (!habit) return;
  const today = todayISO();
  if (!habit.completions.includes(today)) {
    habit.completions.push(today);
    await habit.save();
  }
  res.json({ habit: out(habit) });
});

// PATCH /api/habits/:id/archive   body: { archived: true|false }
router.patch('/:id/archive', async (req, res) => {
  const habit = await findOwn(req, res);
  if (!habit) return;
  habit.archived = req.body.archived !== false;
  await habit.save();
  res.json({ habit: out(habit) });
});

// DELETE /api/habits/:id
router.delete('/:id', async (req, res) => {
  const result = await Habit.deleteOne({ _id: req.params.id, userId: req.user.id });
  if (!result.deletedCount) return res.status(404).json({ message: 'Habit not found' });
  res.json({ message: 'Habit deleted' });
});

export default router;