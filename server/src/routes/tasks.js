import { Router } from 'express';
import { Task } from '../models.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

const TYPES = ['daily', 'long_term'];
const PRIORITIES = ['low', 'medium', 'high'];
const STATUSES = ['todo', 'in_progress', 'completed'];

const escape = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const findOwn = (req) => Task.findOne({ _id: req.params.id, userId: req.user.id });

// keep completedAt in step with status
function applyStatus(task, status) {
  task.status = status;
  task.completedAt = status === 'completed' ? new Date() : null;
}

// GET /api/tasks/summary -> pending vs completed counts
router.get('/summary', async (req, res) => {
  const userId = req.user.id;
  const [total, completed, inProgress] = await Promise.all([
    Task.countDocuments({ userId }),
    Task.countDocuments({ userId, status: 'completed' }),
    Task.countDocuments({ userId, status: 'in_progress' }),
  ]);
  res.json({ total, completed, inProgress, pending: total - completed });
});

// GET /api/tasks?search=&status=&priority=&type=&sort=deadline|priority|newest
router.get('/', async (req, res) => {
  const { search, status, priority, type, sort } = req.query;
  const filter = { userId: req.user.id };
  if (STATUSES.includes(status)) filter.status = status;
  if (PRIORITIES.includes(priority)) filter.priority = priority;
  if (TYPES.includes(type)) filter.type = type;
  if (search) {
    const re = new RegExp(escape(search), 'i');
    filter.$or = [{ title: re }, { description: re }];
  }

  let tasks = await Task.find(filter).sort(sort === 'deadline' ? { deadline: 1 } : { createdAt: -1 });
  if (sort === 'priority') {
    const rank = { high: 0, medium: 1, low: 2 };
    tasks = tasks.sort((a, b) => rank[a.priority] - rank[b.priority]);
  }
  res.json({ tasks });
});

// POST /api/tasks
router.post('/', async (req, res) => {
  const { title, description, type, priority, status, deadline } = req.body;
  if (!title?.trim()) return res.status(400).json({ message: 'Title is required' });
  const task = new Task({
    userId: req.user.id,
    title: title.trim(),
    description: description || '',
    type: TYPES.includes(type) ? type : 'daily',
    priority: PRIORITIES.includes(priority) ? priority : 'medium',
    deadline: deadline || null,
  });
  applyStatus(task, STATUSES.includes(status) ? status : 'todo');
  await task.save();
  res.status(201).json({ task });
});

// PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
  const task = await findOwn(req);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  const { title, description, type, priority, status, deadline } = req.body;
  if (title !== undefined) {
    if (!title.trim()) return res.status(400).json({ message: 'Title cannot be empty' });
    task.title = title.trim();
  }
  if (description !== undefined) task.description = description;
  if (TYPES.includes(type)) task.type = type;
  if (PRIORITIES.includes(priority)) task.priority = priority;
  if (deadline !== undefined) task.deadline = deadline || null;
  if (STATUSES.includes(status) && status !== task.status) applyStatus(task, status);
  await task.save();
  res.json({ task });
});

// PATCH /api/tasks/:id/status  { "status": "completed" }
router.patch('/:id/status', async (req, res) => {
  const task = await findOwn(req);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  if (!STATUSES.includes(req.body.status)) {
    return res.status(400).json({ message: 'Status must be todo, in_progress or completed' });
  }
  applyStatus(task, req.body.status);
  await task.save();
  res.json({ task });
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  const task = await findOwn(req);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  await task.deleteOne();
  res.json({ message: 'Task deleted' });
});

export default router;
