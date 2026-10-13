import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import authRoutes from './routes/auth.js';
import noteRoutes from './routes/notes.js';
import taskRoutes from './routes/tasks.js';
import eventRoutes from './routes/events.js';

const app = express();
app.use(cors());
app.use(express.json());

// ---- API ----
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/events', eventRoutes);
app.use('/api', (req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` }));

// ---- React website (after "npm run build" in client) ----
const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(here, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).send('Frontend not built yet. In development open http://localhost:5173');
  });
});

// ---- Errors ----
app.use((err, req, res, next) => {
  if (err.name === 'CastError') return res.status(404).json({ message: 'Not found' });
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
  }
  if (err.code === 11000) return res.status(409).json({ message: 'Email is already registered' });
  console.error(err);
  res.status(500).json({ message: err.message || 'Server error' });
});

// ---- Start ----
const PORT = process.env.PORT || 5000;
try {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
} catch (err) {
  console.error('Could not connect to MongoDB:', err.message);
  process.exit(1);
}
