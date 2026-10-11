import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import noteRoutes from './routes/note.routes.js';
import taskRoutes from './routes/task.routes.js';
import eventRoutes from './routes/event.routes.js';
import { notFound, errorHandler } from './middleware/error.js';
 
const app = express();
 
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
 
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/events', eventRoutes);
 
app.use(notFound);
app.use(errorHandler);
 
export default app;
