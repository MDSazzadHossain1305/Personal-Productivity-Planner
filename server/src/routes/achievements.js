import { Router } from 'express';
import { Task } from '../models.js';
import { FocusSession, Goal, Habit } from '../models2.js';
import { Achievement } from '../models3.js';
import { requireAuth } from '../auth.js';
import { iso, todayISO } from '../dates.js';
import { buildMetrics, evaluate } from '../achievements.js';

const router = Router();
router.use(requireAuth);

// GET /api/achievements -> the three streaks, every achievement with its progress, and the history
router.get('/', async (req, res) => {
  const userId = req.user.id;
  const today = todayISO();

  const [tasks, focus, habits, goalsCompleted, saved] = await Promise.all([
    Task.find({ userId, status: 'completed', completedAt: { $ne: null } }).select('completedAt'),
    FocusSession.find({ userId, completed: true }).select('date actualMinutes'),
    Habit.find({ userId }).select('completions'),
    Goal.countDocuments({ userId, status: 'completed' }),
    Achievement.find({ userId }),
  ]);

  const { streaks, metrics } = buildMetrics(
    {
      taskDates: tasks.map((t) => iso(t.completedAt)),
      focusDates: focus.map((f) => f.date),
      focusMinutes: focus.reduce((sum, f) => sum + f.actualMinutes, 0),
      habitDates: habits.flatMap((h) => h.completions),
      goalsCompleted,
    },
    today
  );

  const unlockedDates = Object.fromEntries(saved.map((a) => [a.key, a.unlockedAt]));
  let achievements = evaluate(metrics, unlockedDates);

  // save the ones that were reached just now, so the history remembers the date
  const fresh = achievements.filter((a) => a.reached && !a.unlockedAt);
  if (fresh.length) {
    const now = new Date();
    await Achievement.bulkWrite(
      fresh.map((a) => ({
        updateOne: { filter: { userId: req.user._id, key: a.key }, update: { $setOnInsert: { unlockedAt: now } }, upsert: true },
      }))
    );
    for (const a of fresh) unlockedDates[a.key] = now;
    achievements = evaluate(metrics, unlockedDates);
  }

  const history = achievements
    .filter((a) => a.unlocked)
    .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))
    .map((a) => ({ key: a.key, title: a.title, group: a.group, unlockedAt: a.unlockedAt }));

  res.json({
    streaks,
    achievements,
    history,
    unlockedCount: history.length,
    total: achievements.length,
    newlyUnlocked: fresh.map((a) => a.key),
  });
});

export default router;
