import { Router } from 'express';
import { Task } from '../models.js';
import { FocusSession, Habit } from '../models2.js';
import { requireAuth } from '../auth.js';
import { iso, todayISO } from '../dates.js';
import { PERIODS, buildReport, makeBuckets } from '../analytics.js';

const router = Router();
router.use(requireAuth);

// GET /api/analytics?period=daily|weekly|monthly
// -> one entry per day / week / month with tasks completed, focus minutes, habit check-ins and the score
router.get('/', async (req, res) => {
  const period = PERIODS[req.query.period] ? req.query.period : 'daily';
  const userId = req.user.id;
  const today = todayISO();
  const settings = req.user.settings;
  const from = makeBuckets(period, today, settings?.weekStartsOn)[0].from;
  const [y, m, d] = from.split('-').map(Number);

  const [tasks, focus, habits] = await Promise.all([
    Task.find({ userId, status: 'completed', completedAt: { $gte: new Date(y, m - 1, d) } }).select('completedAt'),
    FocusSession.find({ userId, date: { $gte: from } }).select('date actualMinutes completed'),
    Habit.find({ userId }).select('frequency completions createdAt'),
  ]);

  const data = {
    taskDates: tasks.map((t) => iso(t.completedAt)),
    focus: focus.map((f) => ({ date: f.date, minutes: f.actualMinutes, completed: f.completed })),
    habits: habits.map((h) => ({ frequency: h.frequency, created: iso(h.createdAt), completions: h.completions })),
  };
  res.json(buildReport(period, data, settings, today));
});

export default router;
