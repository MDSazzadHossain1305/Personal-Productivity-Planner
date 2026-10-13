import { Router } from 'express';
import { Event } from '../models.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

const findOwn = (req) => Event.findOne({ _id: req.params.id, userId: req.user.id });

// returns an error message, or null when the data is fine
function validate({ title, date, startTime, endTime, reminderMinutes }, partial = false) {
  if ((!partial || title !== undefined) && !title?.trim()) return 'Title is required';
  if ((!partial || date !== undefined) && !DATE_RE.test(date || '')) return 'Date must be YYYY-MM-DD';
  if ((!partial || startTime !== undefined) && !TIME_RE.test(startTime || '')) return 'Start time must be HH:MM';
  if (endTime && !TIME_RE.test(endTime)) return 'End time must be HH:MM';
  if (endTime && startTime && endTime < startTime) return 'End time must be after start time';
  if (reminderMinutes !== undefined && reminderMinutes !== null && reminderMinutes !== '') {
    const n = Number(reminderMinutes);
    if (!Number.isInteger(n) || n < 0) return 'Reminder must be a non-negative number of minutes';
  }
  return null;
}

const toReminder = (v) => (v === undefined || v === null || v === '' ? null : Number(v));

// GET /api/events?from=YYYY-MM-DD&to=YYYY-MM-DD  (day / week / month views)
router.get('/', async (req, res) => {
  const { from, to } = req.query;
  const filter = { userId: req.user.id };
  if (DATE_RE.test(from || '') && DATE_RE.test(to || '')) filter.date = { $gte: from, $lte: to };
  else if (DATE_RE.test(from || '')) filter.date = { $gte: from };
  const events = await Event.find(filter).sort({ date: 1, startTime: 1 });
  res.json({ events });
});

// GET /api/events/upcoming?limit=5 -> from now on, soonest first
router.get('/upcoming', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 5, 50);
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const nowTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const events = await Event.find({
    userId: req.user.id,
    $or: [{ date: { $gt: today } }, { date: today, startTime: { $gte: nowTime } }],
  })
    .sort({ date: 1, startTime: 1 })
    .limit(limit);
  res.json({ events });
});

// POST /api/events
router.post('/', async (req, res) => {
  const error = validate(req.body);
  if (error) return res.status(400).json({ message: error });
  const { title, description, date, startTime, endTime, reminderMinutes } = req.body;
  const event = await Event.create({
    userId: req.user.id,
    title: title.trim(),
    description: description || '',
    date,
    startTime,
    endTime: endTime || null,
    reminderMinutes: toReminder(reminderMinutes),
  });
  res.status(201).json({ event });
});

// PUT /api/events/:id
router.put('/:id', async (req, res) => {
  const event = await findOwn(req);
  if (!event) return res.status(404).json({ message: 'Event not found' });
  const error = validate(req.body, true);
  if (error) return res.status(400).json({ message: error });
  const { title, description, date, startTime, endTime, reminderMinutes } = req.body;
  if (title !== undefined) event.title = title.trim();
  if (description !== undefined) event.description = description;
  if (date !== undefined) event.date = date;
  if (startTime !== undefined) event.startTime = startTime;
  if (endTime !== undefined) event.endTime = endTime || null;
  if (reminderMinutes !== undefined) event.reminderMinutes = toReminder(reminderMinutes);
  await event.save();
  res.json({ event });
});

// DELETE /api/events/:id
router.delete('/:id', async (req, res) => {
  const event = await findOwn(req);
  if (!event) return res.status(404).json({ message: 'Event not found' });
  await event.deleteOne();
  res.json({ message: 'Event deleted' });
});

export default router;
