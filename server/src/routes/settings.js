import { Router } from 'express';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

const NOTIFY_KEYS = ['reminders', 'tasks', 'events', 'goals', 'habits'];
// number settings: [smallest, largest, name shown in the error message]
const NUMBERS = {
  dailyTaskGoal: [1, 50, 'Daily task goal'],
  dailyFocusGoal: [5, 720, 'Daily focus goal'],
  focusMinutes: [1, 180, 'Focus duration'],
  breakMinutes: [1, 60, 'Break duration'],
};

// GET /api/settings
router.get('/', (req, res) => res.json({ settings: req.user.settings }));

// PUT /api/settings   body: any of the settings; only the ones that are sent are changed
router.put('/', async (req, res) => {
  const body = req.body || {};
  const settings = req.user.settings;

  for (const [key, [min, max, label]] of Object.entries(NUMBERS)) {
    if (body[key] === undefined) continue;
    const value = Number(body[key]);
    if (!Number.isInteger(value) || value < min || value > max) {
      return res.status(400).json({ message: `${label} must be a whole number from ${min} to ${max}` });
    }
    settings[key] = value;
  }

  for (const key of ['notificationsEnabled', 'timerSound']) {
    if (body[key] === undefined) continue;
    if (typeof body[key] !== 'boolean') return res.status(400).json({ message: `${key} must be true or false` });
    settings[key] = body[key];
  }

  if (body.notify !== undefined) {
    if (typeof body.notify !== 'object' || body.notify === null) return res.status(400).json({ message: 'notify must be an object' });
    for (const key of NOTIFY_KEYS) {
      if (body.notify[key] === undefined) continue;
      if (typeof body.notify[key] !== 'boolean') return res.status(400).json({ message: `notify.${key} must be true or false` });
      settings.notify[key] = body.notify[key];
    }
  }

  if (body.weekStartsOn !== undefined) {
    if (!['sunday', 'monday'].includes(body.weekStartsOn)) return res.status(400).json({ message: 'Week must start on sunday or monday' });
    settings.weekStartsOn = body.weekStartsOn;
  }

  await req.user.save();
  res.json({ settings: req.user.settings });
});

export default router;
