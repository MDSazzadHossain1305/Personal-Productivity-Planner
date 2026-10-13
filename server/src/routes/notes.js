import { Router } from 'express';
import { Note } from '../models.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

// tags can arrive as an array or as "work, ideas"
const cleanTags = (tags) => {
  const list = Array.isArray(tags) ? tags : String(tags || '').split(',');
  return [...new Set(list.map((t) => String(t).trim().toLowerCase()).filter(Boolean))];
};

// makes user text safe to use inside a search pattern
const escape = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findOwn = (req) => Note.findOne({ _id: req.params.id, userId: req.user.id });

// GET /api/notes?q=&tag=&archived=true|false
router.get('/', async (req, res) => {
  const { q, tag, archived } = req.query;
  const filter = { userId: req.user.id, isArchived: archived === 'true' };
  if (q) {
    const re = new RegExp(escape(q), 'i');
    filter.$or = [{ title: re }, { content: re }];
  }
  if (tag) filter.tags = String(tag).toLowerCase();
  const notes = await Note.find(filter).sort({ isPinned: -1, updatedAt: -1 });
  res.json({ notes });
});

// POST /api/notes
router.post('/', async (req, res) => {
  const { title, content, tags } = req.body;
  if (!title?.trim() && !content?.trim()) {
    return res.status(400).json({ message: 'A note needs a title or some content' });
  }
  const note = await Note.create({
    userId: req.user.id,
    title: title?.trim() || 'Untitled',
    content: content || '',
    tags: cleanTags(tags),
  });
  res.status(201).json({ note });
});

// PUT /api/notes/:id
router.put('/:id', async (req, res) => {
  const note = await findOwn(req);
  if (!note) return res.status(404).json({ message: 'Note not found' });
  const { title, content, tags } = req.body;
  if (title !== undefined) note.title = title.trim() || 'Untitled';
  if (content !== undefined) note.content = content;
  if (tags !== undefined) note.tags = cleanTags(tags);
  await note.save();
  res.json({ note });
});

// PATCH /api/notes/:id/pin (toggle)
router.patch('/:id/pin', async (req, res) => {
  const note = await findOwn(req);
  if (!note) return res.status(404).json({ message: 'Note not found' });
  note.isPinned = !note.isPinned;
  await note.save();
  res.json({ note });
});

// PATCH /api/notes/:id/archive (toggle; archiving also unpins)
router.patch('/:id/archive', async (req, res) => {
  const note = await findOwn(req);
  if (!note) return res.status(404).json({ message: 'Note not found' });
  note.isArchived = !note.isArchived;
  if (note.isArchived) note.isPinned = false;
  await note.save();
  res.json({ note });
});

// DELETE /api/notes/:id
router.delete('/:id', async (req, res) => {
  const note = await findOwn(req);
  if (!note) return res.status(404).json({ message: 'Note not found' });
  await note.deleteOne();
  res.json({ message: 'Note deleted' });
});

export default router;
