import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models.js';
import { requireAuth } from '../auth.js';

const router = Router();

const signToken = (user) =>
  jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const isEmail = (v) => /^\S+@\S+\.\S+$/.test(v || '');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });
  if (!isEmail(email)) return res.status(400).json({ message: 'A valid email is required' });
  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (await User.findOne({ email: normalizedEmail })) {
    return res.status(409).json({ message: 'Email is already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash });
  res.status(201).json({ token: signToken(user), user });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || '').trim().toLowerCase() });
  const ok = user && (await bcrypt.compare(password || '', user.passwordHash));
  if (!ok) return res.status(401).json({ message: 'Invalid email or password' });
  res.json({ token: signToken(user), user });
});

// Everything below needs a valid token
router.use(requireAuth);

// POST /api/auth/logout (the client deletes its token)
router.post('/logout', (req, res) => res.json({ message: 'Logged out' }));

// GET /api/auth/me -> account information
router.get('/me', (req, res) => res.json({ user: req.user }));

// PUT /api/auth/profile -> update name, phone, bio
router.put('/profile', async (req, res) => {
  const { name, phone, bio } = req.body;
  if (name !== undefined && !name.trim()) return res.status(400).json({ message: 'Name cannot be empty' });
  if (name !== undefined) req.user.name = name.trim();
  if (phone !== undefined) req.user.phone = phone;
  if (bio !== undefined) req.user.bio = bio;
  await req.user.save();
  res.json({ user: req.user });
});

// PUT /api/auth/password -> change password
router.put('/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const ok = await bcrypt.compare(currentPassword || '', req.user.passwordHash);
  if (!ok) return res.status(400).json({ message: 'Current password is incorrect' });
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters' });
  }
  req.user.passwordHash = await bcrypt.hash(newPassword, 10);
  await req.user.save();
  res.json({ message: 'Password updated' });
});

export default router;
