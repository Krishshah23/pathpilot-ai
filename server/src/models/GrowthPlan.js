import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * A persisted Growth Path (learning roadmap) for a student. One active plan per
 * user; regenerating replaces it while preserving completion for tasks that
 * carry over (matched by `key`). Task progress lives here so the roadmap and
 * Insights can report real completion.
 */
const taskSchema = new Schema(
  {
    key: { type: String, required: true }, // stable per-skill id (e.g. "node-js")
    skill: String,
    title: String,
    priority: { type: String, enum: ['core', 'recommended', 'supporting'], default: 'core' },
    difficulty: { type: String, default: 'Beginner' },
    estimatedHours: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { _id: false }
);

const weekSchema = new Schema(
  {
    week: Number,
    title: String,
    focusHours: Number,
    tasks: { type: [taskSchema], default: [] },
  },
  { _id: false }
);

const growthPlanSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    targetRole: { type: String, required: true },
    summary: { type: String, default: '' },
    coverageStart: { type: Number, default: 0 }, // gap coverage when generated
    totalWeeks: { type: Number, default: 0 },
    totalTasks: { type: Number, default: 0 },
    totalHours: { type: Number, default: 0 },
    strengths: { type: [String], default: [] },
    weeks: { type: [weekSchema], default: [] },
  },
  { timestamps: true }
);

export const GrowthPlan = mongoose.model('GrowthPlan', growthPlanSchema);
