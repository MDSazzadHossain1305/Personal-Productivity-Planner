import { Router } from 'express';
import { FocusSession } from '../models2.js';
import { requireAuth } from '../auth.js';
import { addDays, todayISO } from '../dates.js';
import { dailyStats } from '../streak.js';

const router = Router();
router.use(requireAuth);

const MAX_STEPS = 12;

// checks a plan like [{ kind: 'focus', minutes: 10 }, { kind: 'break', minutes: 5 }]
// returns a clean copy, or null if something is wrong
function cleanSteps(steps) {
  if (!Array.isArray(steps) || steps.length < 1 || steps.length > MAX_STEPS) return null;
  const clean = [];
  for (const s of steps) {
    const minutes = Number(s?.minutes);
    if (!['focus', 'break'].includes(s?.kind)) return null;
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) return null;
    clean.push({ kind: s.kind, minutes });
  }
  return clean.some((s) => s.kind === 'focus') ? clean : null;
}

// GET /api/focus?days=30  -> the History list (newest first)
router.get('/', async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
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

// POST /api/focus   body: { label, steps: [{ kind, minutes }], actualMinutes, completed }
router.post('/', async (req, res) => {
  let steps;
  if (req.body.steps !== undefined) {
    steps = cleanSteps(req.body.steps);
    if (!steps) {
      return res.status(400).json({ message: 'The plan needs 1 to 12 steps of 1 to 180 minutes, with at least one focus step' });
    }
  } else {
    // older pages send only plannedMinutes: treat it as a plan with one focus step
    const planned = Number(req.body.plannedMinutes);
    if (!Number.isFinite(planned) || planned < 1 || planned > 180) {
      return res.status(400).json({ message: 'Focus duration must be between 1 and 180 minutes' });
    }
    steps = [{ kind: 'focus', minutes: Math.round(planned) }];
  }
  const planned = steps.filter((s) => s.kind === 'focus').reduce((t, s) => t + s.minutes, 0);
  const actual = Number(req.body.actualMinutes);
  if (!Number.isFinite(actual) || actual < 0) return res.status(400).json({ message: 'Invalid focused time' });

  const session = await FocusSession.create({
    userId: req.user.id,
    label: String(req.body.label || '').slice(0, 80),
    steps,
    plannedMinutes: planned,
    actualMinutes: Math.min(Math.round(actual), planned),
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