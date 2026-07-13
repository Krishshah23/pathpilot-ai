import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Persists a completed AI mock interview session.
 * One document per session. Used for historical tracking and Path Score evolution.
 */
const questionResultSchema = new Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, default: '' },
    gapAddressed: { type: String, default: '' },
    totalScore: { type: Number, default: 0 },
    grade: { type: String, default: '' },
    strengths: { type: [String], default: [] },
    improvements: { type: [String], default: [] },
    modelAnswer: { type: String, default: '' },
    timeTakenSeconds: { type: Number, default: 0 },
  },
  { _id: false }
);

const interviewSessionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetRole: { type: String, required: true },
    gapsAddressed: { type: [String], default: [] },
    questions: { type: [questionResultSchema], default: [] },
    totalQuestions: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const InterviewSession = mongoose.model('InterviewSession', interviewSessionSchema);
