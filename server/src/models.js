import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// Shared settings for every collection:
// - timestamps adds createdAt and updatedAt automatically
// - toJSON sends "id" instead of "_id" (so the React pages work unchanged)
//   and never sends the password hash
const options = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => {
      delete ret._id;
      delete ret.passwordHash;
      return ret;
    },
  },
};

const owner = { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true };

export const User = model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  phone: { type: String, default: '' },
  bio: { type: String, default: '' },
}, options));

export const Note = model('Note', new Schema({
  userId: owner,
  title: { type: String, default: 'Untitled' },
  content: { type: String, default: '' },
  tags: { type: [String], default: [] },
  isPinned: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
}, options));

export const Task = model('Task', new Schema({
  userId: owner,
  title: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['daily', 'long_term'], default: 'daily' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['todo', 'in_progress', 'completed'], default: 'todo' },
  deadline: { type: String, default: null }, // "YYYY-MM-DD"
  completedAt: { type: Date, default: null },
}, options));

export const Event = model('Event', new Schema({
  userId: owner,
  title: { type: String, required: true },
  description: { type: String, default: '' },
  date: { type: String, required: true },      // "YYYY-MM-DD"
  startTime: { type: String, required: true }, // "HH:MM"
  endTime: { type: String, default: null },
  reminderMinutes: { type: Number, default: null }, // minutes before; null = no reminder
}, options));
