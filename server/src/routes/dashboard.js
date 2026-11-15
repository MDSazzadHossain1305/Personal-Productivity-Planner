import { Router } from 'express';
import { Task, Event } from '../models.js';
import { FocusSession, Goal, Habit } from '../models2.js';
import { requireAuth } from '../auth.js';
import { iso, mondayOf, nowHHMM, todayISO } from '../dates.js';
import { dailyStats, weeklyStats } from '../streak.js';
import { habitLoad, productivityScore } from '../scoring.js';

const router = Router();
router.use(requireAuth);

const PRIORITY = { high: 0, medium: 1, low: 2 };

// GET /api/dashboard -> everything the Today page shows, in one request
router.get('/', async (req, res) => {
  const userId = req.user.id;
  const today = todayISO();
  const now = nowHHMM();
  const settings = req.user.settings;

  const [tasks, events, goals, habits, sessions] = await Promise.all([
    Task.find({ userId }),
    Event.find({ userId, date: { $gte: today } }).sort({ date: 1, startTime: 1 }).limit(20),
    Goal.find({ userId, archived: false, status: { $ne: 'completed' } }),
    Habit.find({ userId, archived: false }).sort({ createdAt: 1 }),
    FocusSession.find({ userId, date: today }),
  ]);

  // ---- tasks ----
  const doneToday = (t) => t.status === 'completed' && t.completedAt && iso(t.completedAt) === today;
  const open = tasks.filter((t) => t.status !== 'completed');
  const todayList = tasks
    .filter((t) => doneToday(t) || (t.status !== 'completed' && t.deadline && t.deadline <= today))
    .sort((a, b) => (a.status === 'completed') - (b.status === 'completed') || PRIORITY[a.priority] - PRIORITY[b.priority])
    .map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      status: t.status,
      deadline: t.deadline,
      overdue: t.status !== 'completed' && Boolean(t.deadline) && t.deadline < today,
    }));
  const completedToday = tasks.filter(doneToday).length;

  // ---- events: the next five that have not finished ----
  const upcoming = events
    .filter((e) => e.date > today || (e.endTime || e.startTime) >= now)
    .slice(0, 5)
    .map((e) => ({ id: e.id, title: e.title, date: e.date, startTime: e.startTime, endTime: e.endTime }));

  // ---- goals: progress = milestones done / all milestones ----
  const goalList = goals
    .map((g) => {
      const done = g.milestones.filter((m) => m.done).length;
      return {
        id: g.id,
        title: g.title,
        targetDate: g.targetDate,
        status: g.status,
        milestones: g.milestones.length,
        milestonesDone: done,
        progress: g.milestones.length ? Math.round((done / g.milestones.length) * 100) : 0,
      };
    })
    .sort((a, b) => ((a.targetDate || '9999') < (b.targetDate || '9999') ? -1 : 1))
    .slice(0, 4);

  // ---- habits ----
  const week = mondayOf(today);
  const habitList = habits.map((h) => {
    const weekly = h.frequency === 'weekly';
    const since = [iso(h.createdAt), ...h.completions].sort()[0];
    const stats = weekly ? weeklyStats(h.completions, today, since) : dailyStats(h.completions, today, since);
    const doneNow = weekly ? h.completions.some((d) => mondayOf(d) === week) : h.completions.includes(today);
    return { id: h.id, name: h.name, frequency: h.frequency, doneNow, streak: stats.current };
  });

  // ---- productivity score for today ----
  const focusMinutes = sessions.reduce((sum, s) => sum + s.actualMinutes, 0);
  const load = habitLoad(
    habits.map((h) => ({ frequency: h.frequency, created: iso(h.createdAt), completions: h.completions })),
    today,
    today
  );
  const score = productivityScore({ tasks: completedToday, focusMinutes, ...load }, settings, 1);

  res.json({
    date: today,
    score,
    targets: { dailyTaskGoal: settings.dailyTaskGoal, dailyFocusGoal: settings.dailyFocusGoal },
    tasks: {
      today: todayList,
      completedToday,
      pendingToday: todayList.filter((t) => t.status !== 'completed').length,
      overdue: todayList.filter((t) => t.overdue).length,
      totalCompleted: tasks.length - open.length,
      totalPending: open.length,
    },
    events: upcoming,
    goals: goalList,
    habits: { list: habitList, done: habitList.filter((h) => h.doneNow).length, total: habitList.length },
    focus: { minutes: focusMinutes, sessions: sessions.filter((s) => s.completed).length },
  });
});

export default router;
