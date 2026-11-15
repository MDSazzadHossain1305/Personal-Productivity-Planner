import { Router } from 'express';
import { FocusSession } from '../models2.js';
import { requireAuth } from '../auth.js';
import { addDays, todayISO } from '../dates.js';
import { dailyStats } from '../streak.js';

const router = Router();
router.use(requireAuth);

// GET /api/focus?days=7  -> recent sessions (newest first)
router.get('/', async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 1), 90);
  const from = addDays(todayISO(), -(days - 1));
  const sessions = await FocusSession.find({ userId: req.user.id, date: { $gte: from } }).sort({ createdAt: -1 });
  res.json({ sessions });
});

// GET /api/focus/summary -> today, this week, focus streak
router.get('/summary', async (req, res) => {
  const today = todayISO();
  const done = await FocusSession.find({ userId: req.user.id, completed: true }).select('date actualMinutes');
  const weekFrom = addDays(today, -6);
  const sum = (list) => ({ sessions: list.length, minutes: list.reduce((t, s) => t + s.actualMinutes, 0) });
  const dates = done.map((s) => s.date);
  const since = dates.length ? [...dates].sort()[0] : today;
  res.json({
    today: sum(done.filter((s) => s.date === today)),
    week: sum(done.filter((s) => s.date >= weekFrom)),
    total: sum(done),
    streak: dailyStats(dates, today, since).current,
  });
});

// POST /api/focus   body: { label, plannedMinutes, actualMinutes, completed }
router.post('/', async (req, res) => {
  const planned = Number(req.body.plannedMinutes);
  const actual = Number(req.body.actualMinutes);
  if (!Number.isFinite(planned) || planned < 1 || planned > 180) {
    return res.status(400).json({ message: 'Focus duration must be between 1 and 180 minutes' });
  }
  if (!Number.isFinite(actual) || actual < 0) return res.status(400).json({ message: 'Invalid focused time' });
  const session = await FocusSession.create({
    userId: req.user.id,
    label: req.body.label || '',
    plannedMinutes: Math.round(planned),
    actualMinutes: Math.min(Math.round(actual), 180),
    completed: req.body.completed !== false,
    date: todayISO(),
  });
  res.status(201).json({ session });
});

// DELETE /api/focus/:id
router.delete('/:id', async (req, res) => {
  const result = await FocusSession.deleteOne({ _id: req.params.id, userId: req.user.id });
  if (!result.deletedCount) return res.status(404).json({ message: 'Session not found' });
  res.json({ message: 'Session deleted' });
});

export default router;
