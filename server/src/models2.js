// Module 2 data models (Goals, Habits, Focus sessions, Reminders, Notifications).
// They live in their own file so Module 1's models.js does not need to change.
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// same JSON shape as Module 1: _id becomes id, __v is hidden
const toJSON = {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
};
const base = { timestamps: true, toJSON };
const owner = { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true };

// ---------- Goals & Milestones (Member-2) ----------
const milestoneSchema = new Schema(
  {
    title: { type: String, required: [true, 'Milestone title is required'], trim: true },
    done: { type: Boolean, default: false },
    doneAt: { type: Date, default: null },
  },
  { toJSON }
);

const goalSchema = new Schema(
  {
    userId: owner,
    title: { type: String, required: [true, 'Goal title is required'], trim: true },
    description: { type: String, default: '', trim: true },
    targetDate: { type: String, default: '' },
    status: { type: String, enum: ['not_started', 'in_progress', 'completed', 'on_hold'], default: 'not_started' },
    archived: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    milestones: [milestoneSchema],
  },
  base
);

// ---------- Habit Tracker (Member-3) ----------
const habitSchema = new Schema(
  {
    userId: owner,
    name: { type: String, required: [true, 'Habit name is required'], trim: true },
    description: { type: String, default: '', trim: true },
    frequency: { type: String, enum: ['daily', 'weekly'], default: 'daily' },
    completions: { type: [String], default: [] }, // every date the habit was done, "YYYY-MM-DD"
    archived: { type: Boolean, default: false },
  },
  base
);

// ---------- Focus / Pomodoro Timer (Member-1) ----------
const focusSchema = new Schema(
  {
    userId: owner,
    label: { type: String, default: '', trim: true },
    plannedMinutes: { type: Number, required: true, min: 1, max: 180 },
    actualMinutes: { type: Number, required: true, min: 0, max: 180 },
    completed: { type: Boolean, default: true },
    date: { type: String, required: true }, // day the session ended
  },
  base
);

// ---------- Reminders & Notifications (Member-2) ----------
const reminderSchema = new Schema(
  {
    userId: owner,
    title: { type: String, required: [true, 'Reminder title is required'], trim: true },
    note: { type: String, default: '', trim: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
  },
  base
);

const notificationSchema = new Schema(
  {
    userId: owner,
    type: { type: String, enum: ['reminder', 'task', 'event', 'goal', 'habit'], required: true },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    key: { type: String, required: true }, // makes sure the same alert is created only once
    dismissed: { type: Boolean, default: false }, // "deleted" by the user
  },
  base
);
notificationSchema.index({ userId: 1, key: 1 }, { unique: true });

export const Goal = model('Goal', goalSchema);
export const Habit = model('Habit', habitSchema);
export const FocusSession = model('FocusSession', focusSchema);
export const Reminder = model('Reminder', reminderSchema);
export const Notification = model('Notification', notificationSchema);
