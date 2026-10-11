import { Router } from 'express';
import { Op } from 'sequelize';
import { Note } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
 
const router = Router();
router.use(requireAuth);
 
// tags can arrive as an array or a comma-separated string
const cleanTags = (tags) => {
  const list = Array.isArray(tags) ? tags : String(tags || '').split(',');
  return [...new Set(list.map((t) => String(t).trim().toLowerCase()).filter(Boolean))];
};
 
const findOwn = (req) => Note.findOne({ where: { id: req.params.id, userId: req.user.id } });
 
// GET /api/notes?q=&tag=&archived=true|false
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q, tag, archived } = req.query;
    const where = { userId: req.user.id, isArchived: archived === 'true' };
    if (q) where[Op.or] = [{ title: { [Op.like]: `%${q}%` } }, { content: { [Op.like]: `%${q}%` } }];
 
    let notes = await Note.findAll({
      where,
      order: [['isPinned', 'DESC'], ['updatedAt', 'DESC']],
    });
    if (tag) notes = notes.filter((n) => (n.tags || []).includes(String(tag).toLowerCase()));
    res.json({ notes });
  })
);
 
// POST /api/notes
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { title, content, tags } = req.body;
    if (!title?.trim() && !content?.trim())
      return res.status(400).json({ message: 'A note needs a title or some content' });
    const note = await Note.create({
      userId: req.user.id,
      title: title?.trim() || 'Untitled',
      content: content || '',
      tags: cleanTags(tags),
    });
    res.status(201).json({ note });
  })
);
 
// PUT /api/notes/:id
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const note = await findOwn(req);
    if (!note) return res.status(404).json({ message: 'Note not found' });
    const { title, content, tags } = req.body;
    if (title !== undefined) note.title = title.trim() || 'Untitled';
    if (content !== undefined) note.content = content;
    if (tags !== undefined) note.tags = cleanTags(tags);
    await note.save();
    res.json({ note });
  })
);
 
// PATCH /api/notes/:id/pin  (toggle)
router.patch(
  '/:id/pin',
  asyncHandler(async (req, res) => {
    const note = await findOwn(req);
    if (!note) return res.status(404).json({ message: 'Note not found' });
    note.isPinned = !note.isPinned;
    await note.save();
    res.json({ note });
  })
);
 
// PATCH /api/notes/:id/archive  (toggle; archiving also unpins)
router.patch(
  '/:id/archive',
  asyncHandler(async (req, res) => {
    const note = await findOwn(req);
    if (!note) return res.status(404).json({ message: 'Note not found' });
    note.isArchived = !note.isArchived;
    if (note.isArchived) note.isPinned = false;
    await note.save();
    res.json({ note });
  })
);
 
// DELETE /api/notes/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const note = await findOwn(req);
    if (!note) return res.status(404).json({ message: 'Note not found' });
    await note.destroy();
    res.json({ message: 'Note deleted' });
  })
);
 
export default router;
