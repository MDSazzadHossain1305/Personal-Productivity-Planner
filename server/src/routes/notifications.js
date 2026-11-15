import { Router } from 'express';
import { Task, Event } from '../models.js';
import { Goal, Habit, Notification, Reminder } from '../models2.js';
import { requireAuth } from '../auth.js';
import { addDays, mondayOf, nowHHMM, todayISO } from '../dates.js';

const router = Router();
router.use(requireAuth);

// Looks at the user's tasks, events, goals, habits and reminders and creates the
// notifications that are due right now. The unique "key" stops the same alert being created twice.
async function generate(user) {
  // Settings & Preferences: the user can switch all alerts off, or only some kinds
  const prefs = user.settings || {};
  if (prefs.notificationsEnabled === false) return;
  const userId = user._id;
  const today = todayISO();
  const tomorrow = addDays(today, 1);
  const now = nowHHMM();
  const found = [];
  const add = (type, key, title, message) => found.push({ type, key, title, message });

  // 1. reminders that have reached their date and time (last 2 days only)
  const reminders = await Reminder.find({ userId, date: { $gte: addDays(today, -1), $lte: today } });
  for (const r of reminders) {
    if (r.date < today || r.time <= now) add('reminder', `reminder:${r.id}`, r.title, r.note || `Reminder for ${r.date} ${r.time}`);
  }

  // 2. tasks due today or tomorrow that are not completed
  const tasks = await Task.find({ userId, status: { $ne: 'completed' }, deadline: { $in: [today, tomorrow] } });
  for (const t of tasks) {
    add('task', `task:${t.id}:${t.deadline}`, t.title, t.deadline === today ? 'Task is due today' : 'Task is due tomorrow');
  }

  // 3. events happening today (not finished yet) or tomorrow
  const events = await Event.find({ userId, date: { $in: [today, tomorrow] } });
  for (const e of events) {
    if (e.date === today && e.endTime && e.endTime < now) continue;
    add('event', `event:${e.id}:${e.date}`, e.title, `${e.date === today ? 'Today' : 'Tomorrow'} at ${e.startTime}`);
  }

  // 4. goals whose target date is within 3 days
  const goals = await Goal.find({
    userId,
    archived: false,
    status: { $ne: 'completed' },
    targetDate: { $gte: today, $lte: addDays(today, 3) },
  });
  for (const g of goals) {
    add('goal', `goal:${g.id}:${g.targetDate}`, g.title, g.targetDate === today ? 'Goal deadline is today' : `Goal deadline is ${g.targetDate}`);
  }

  // 5. habits that are still not done in the evening (after 18:00)
  if (now >= '18:00') {
    const habits = await Habit.find({ userId, archived: false });
    const week = mondayOf(today);
    for (const h of habits) {
      if (h.frequency === 'weekly') {
        if (!h.completions.some((d) => mondayOf(d) === week)) add('habit', `habit:${h.id}:${week}`, h.name, 'Not done yet this week');
      } else if (!h.completions.includes(today)) {
        add('habit', `habit:${h.id}:${today}`, h.name, 'Not done yet today');
      }
    }
  }

  const wanted = found.filter((n) => prefs.notify?.[`${n.type}s`] !== false);
  if (!wanted.length) return;
  // insert only the new ones; existing keys (even dismissed ones) are left untouched
  await Notification.bulkWrite(
    wanted.map((n) => ({
      updateOne: {
        filter: { userId, key: n.key },
        update: { $setOnInsert: { type: n.type, title: n.title, message: n.message, dismissed: false } },
        upsert: true,
      },
    }))
  );
}

// GET /api/notifications
router.get('/', async (req, res) => {
  await generate(req.user);
  const notifications = await Notification.find({ userId: req.user.id, dismissed: false }).sort({ createdAt: -1 }).limit(100);
  res.json({ notifications });
});

// DELETE /api/notifications   -> delete all
router.delete('/', async (req, res) => {
  await Notification.updateMany({ userId: req.user.id, dismissed: false }, { dismissed: true });
  res.json({ message: 'All notifications deleted' });
});

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { dismissed: true });
  if (!n) return res.status(404).json({ message: 'Notification not found' });
  res.json({ message: 'Notification deleted' });
});

export default router;
