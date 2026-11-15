import { Router } from 'express';
import { Reminder } from '../models2.js';
import { requireAuth } from '../auth.js';
import { isDate, isTime, nowHHMM, todayISO } from '../dates.js';

const router = Router();
router.use(requireAuth);

function validate({ title, date, time }) {
  if (!title?.trim()) return 'Title is required';
  if (!isDate(date)) return 'Date must be YYYY-MM-DD';
  if (!isTime(time)) return 'Time must be HH:MM';
  return null;
}

// GET /api/reminders?filter=upcoming|past
router.get('/', async (req, res) => {
  const reminders = await Reminder.find({ userId: req.user.id }).sort({ date: 1, time: 1 });
  const today = todayISO();
  const now = nowHHMM();
  const isPast = (r) => r.date < today || (r.date === today && r.time < now);
  const { filter } = req.query;
  const list = filter === 'upcoming' ? reminders.filter((r) => !isPast(r)) : filter === 'past' ? reminders.filter(isPast) : reminders;
  res.json({ reminders: list });
});

// POST /api/reminders   body: { title, note, date, time }
router.post('/', async (req, res) => {
  const problem = validate(req.body);
  if (problem) return res.status(400).json({ message: problem });
  const { title, note, date, time } = req.body;
  const reminder = await Reminder.create({ userId: req.user.id, title, note: note || '', date, time });
  res.status(201).json({ reminder });
});

// PUT /api/reminders/:id
router.put('/:id', async (req, res) => {
  const reminder = await Reminder.findOne({ _id: req.params.id, userId: req.user.id });
  if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
  const merged = {
    title: req.body.title ?? reminder.title,
    date: req.body.date ?? reminder.date,
    time: req.body.time ?? reminder.time,
  };
  const problem = validate(merged);
  if (problem) return res.status(400).json({ message: problem });
  reminder.set({ ...merged, note: req.body.note ?? reminder.note });
  await reminder.save();
  res.json({ reminder });
});

// DELETE /api/reminders/:id
router.delete('/:id', async (req, res) => {
  const result = await Reminder.deleteOne({ _id: req.params.id, userId: req.user.id });
  if (!result.deletedCount) return res.status(404).json({ message: 'Reminder not found' });
  res.json({ message: 'Reminder deleted' });
});

export default router;
