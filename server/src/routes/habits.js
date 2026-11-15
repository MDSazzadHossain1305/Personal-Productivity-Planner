import { Router } from 'express';
import { Habit } from '../models2.js';
import { requireAuth } from '../auth.js';
import { addDays, dayNumber, isDate, iso, mondayOf, todayISO } from '../dates.js';
import { dailyStats, weeklyStats } from '../streak.js';

const router = Router();
router.use(requireAuth);

// habit + streak, consistency and the last 28 days of history
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
  const history = [];
  for (let i = 27; i >= 0; i -= 1) {
    const d = addDays(today, -i);
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

// PUT /api/habits/:id   body: { name, description, frequency }
router.put('/:id', async (req, res) => {
  const habit = await findOwn(req, res);
  if (!habit) return;
  const { name, description, frequency } = req.body;
  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ message: 'Name cannot be empty' });
    habit.name = name;
  }
  if (description !== undefined) habit.description = description;
  if (frequency !== undefined) {
    if (!['daily', 'weekly'].includes(frequency)) return res.status(400).json({ message: 'Frequency must be daily or weekly' });
    habit.frequency = frequency;
  }
  await habit.save();
  res.json({ habit: out(habit) });
});

// POST /api/habits/:id/complete   body: { date }   (date optional, default today)
// Marks the habit done for that day. Calling it again for the same day undoes it.
router.post('/:id/complete', async (req, res) => {
  const habit = await findOwn(req, res);
  if (!habit) return;
  const today = todayISO();
  const date = req.body.date || today;
  if (!isDate(date)) return res.status(400).json({ message: 'Date must be YYYY-MM-DD' });
  if (date > today) return res.status(400).json({ message: 'You cannot complete a habit in the future' });
  if (dayNumber(today) - dayNumber(date) > 60) return res.status(400).json({ message: 'Date is too far in the past' });
  if (habit.completions.includes(date)) habit.completions.pull(date);
  else habit.completions.push(date);
  await habit.save();
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
