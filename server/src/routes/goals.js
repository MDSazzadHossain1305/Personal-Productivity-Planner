import { Router } from 'express';
import { Goal } from '../models2.js';
import { requireAuth } from '../auth.js';
import { isDate } from '../dates.js';

const router = Router();
router.use(requireAuth);

const STATUSES = ['not_started', 'in_progress', 'completed', 'on_hold'];

// goal + its progress percentage (done milestones / all milestones)
function out(goal) {
  const list = goal.milestones;
  const done = list.filter((m) => m.done).length;
  let progress = 0;
  if (list.length) progress = Math.round((done / list.length) * 100);
  else if (goal.status === 'completed') progress = 100;
  return { ...goal.toJSON(), progress, milestonesDone: done };
}

// keep the status in step with the milestones
function syncStatus(goal) {
  const list = goal.milestones;
  const done = list.filter((m) => m.done).length;
  if (list.length && done === list.length) goal.status = 'completed';
  else if (goal.status === 'completed') goal.status = 'in_progress';
  else if (done > 0 && goal.status === 'not_started') goal.status = 'in_progress';
  goal.completedAt = goal.status === 'completed' ? goal.completedAt || new Date() : null;
}

async function findOwn(req, res) {
  const goal = await Goal.findOne({ _id: req.params.id, userId: req.user.id });
  if (!goal) res.status(404).json({ message: 'Goal not found' });
  return goal;
}

// GET /api/goals?archived=true&status=&q=
router.get('/', async (req, res) => {
  const { archived, status, q } = req.query;
  const filter = { userId: req.user.id, archived: archived === 'true' };
  if (STATUSES.includes(status)) filter.status = status;
  if (q) filter.title = { $regex: String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const goals = await Goal.find(filter).sort({ createdAt: -1 });
  // nearest target date first, goals without a date go to the bottom
  goals.sort((a, b) => ((a.targetDate || '9999') < (b.targetDate || '9999') ? -1 : 1));
  res.json({ goals: goals.map(out) });
});

// POST /api/goals   body: { title, description, targetDate, status, milestones: ["step 1", ...] }
router.post('/', async (req, res) => {
  const { title, description, targetDate, status, milestones } = req.body;
  if (!title?.trim()) return res.status(400).json({ message: 'Title is required' });
  if (targetDate && !isDate(targetDate)) return res.status(400).json({ message: 'Target date must be YYYY-MM-DD' });
  if (status && !STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });
  const goal = new Goal({
    userId: req.user.id,
    title,
    description: description || '',
    targetDate: targetDate || '',
    status: status || 'not_started',
    milestones: (Array.isArray(milestones) ? milestones : [])
      .filter((m) => typeof m === 'string' && m.trim())
      .map((m) => ({ title: m.trim() })),
  });
  syncStatus(goal);
  await goal.save();
  res.status(201).json({ goal: out(goal) });
});

// PUT /api/goals/:id   body: { title, description, targetDate, status }
router.put('/:id', async (req, res) => {
  const goal = await findOwn(req, res);
  if (!goal) return;
  const { title, description, targetDate, status } = req.body;
  if (title !== undefined) {
    if (!title.trim()) return res.status(400).json({ message: 'Title cannot be empty' });
    goal.title = title;
  }
  if (description !== undefined) goal.description = description;
  if (targetDate !== undefined) {
    if (targetDate && !isDate(targetDate)) return res.status(400).json({ message: 'Target date must be YYYY-MM-DD' });
    goal.targetDate = targetDate;
  }
  if (status !== undefined) {
    if (!STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    goal.status = status;
    goal.completedAt = status === 'completed' ? goal.completedAt || new Date() : null;
    if (status !== 'completed') goal.archived = false;
  }
  await goal.save();
  res.json({ goal: out(goal) });
});

// PATCH /api/goals/:id/archive   body: { archived: true|false }  (only completed goals can be archived)
router.patch('/:id/archive', async (req, res) => {
  const goal = await findOwn(req, res);
  if (!goal) return;
  const archived = req.body.archived !== false;
  if (archived && goal.status !== 'completed') {
    return res.status(400).json({ message: 'Only completed goals can be archived' });
  }
  goal.archived = archived;
  await goal.save();
  res.json({ goal: out(goal) });
});

// POST /api/goals/:id/milestones   body: { title }
router.post('/:id/milestones', async (req, res) => {
  const goal = await findOwn(req, res);
  if (!goal) return;
  if (!req.body.title?.trim()) return res.status(400).json({ message: 'Milestone title is required' });
  goal.milestones.push({ title: req.body.title.trim() });
  syncStatus(goal);
  await goal.save();
  res.status(201).json({ goal: out(goal) });
});

// PATCH /api/goals/:id/milestones/:mid   body: { done, title }
router.patch('/:id/milestones/:mid', async (req, res) => {
  const goal = await findOwn(req, res);
  if (!goal) return;
  const m = goal.milestones.id(req.params.mid);
  if (!m) return res.status(404).json({ message: 'Milestone not found' });
  if (req.body.title !== undefined) {
    if (!req.body.title.trim()) return res.status(400).json({ message: 'Milestone title cannot be empty' });
    m.title = req.body.title.trim();
  }
  if (req.body.done !== undefined) {
    m.done = Boolean(req.body.done);
    m.doneAt = m.done ? new Date() : null;
  }
  syncStatus(goal);
  await goal.save();
  res.json({ goal: out(goal) });
});

// DELETE /api/goals/:id/milestones/:mid
router.delete('/:id/milestones/:mid', async (req, res) => {
  const goal = await findOwn(req, res);
  if (!goal) return;
  if (!goal.milestones.id(req.params.mid)) return res.status(404).json({ message: 'Milestone not found' });
  goal.milestones.pull({ _id: req.params.mid });
  syncStatus(goal);
  await goal.save();
  res.json({ goal: out(goal) });
});

// DELETE /api/goals/:id
router.delete('/:id', async (req, res) => {
  const result = await Goal.deleteOne({ _id: req.params.id, userId: req.user.id });
  if (!result.deletedCount) return res.status(404).json({ message: 'Goal not found' });
  res.json({ message: 'Goal deleted' });
});

export default router;
