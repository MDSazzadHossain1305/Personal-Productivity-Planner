// Module 3 data model: the achievements a user has unlocked.
// Saving them keeps the achievement history, even if the tasks behind them are deleted later.
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const achievementSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    key: { type: String, required: true }, // which achievement, for example "tasks-10"
    unlockedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
achievementSchema.index({ userId: 1, key: 1 }, { unique: true });

export const Achievement = model('Achievement', achievementSchema);
