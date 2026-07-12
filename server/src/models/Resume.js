import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * A parsed resume analysis. One document per upload, so a student can see how
 * their resume health improves over time. The most recent doc is the "active"
 * analysis surfaced in the UI.
 */
const healthFactorSchema = new Schema(
  {
    label: String,
    score: Number,
    max: Number,
    status: { type: String, enum: ['good', 'warn', 'bad'] },
    tip: { type: String, default: '' },
  },
  { _id: false }
);

const projectSchema = new Schema(
  { title: String, description: { type: String, default: '' } },
  { _id: false }
);

const resumeSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    fileUrl: { type: String, required: true },
    originalName: { type: String, default: '' },

    // Extracted structure
    skills: { type: [String], default: [] },
    education: { type: [String], default: [] },
    projects: { type: [projectSchema], default: [] },
    experience: { type: [String], default: [] },
    certifications: { type: [String], default: [] },
    contact: {
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      github: { type: String, default: '' },
    },

    // Health
    healthScore: { type: Number, default: 0 },
    healthBreakdown: { type: [healthFactorSchema], default: [] },
    suggestions: { type: [String], default: [] },
    
    redFlags: {
      type: [
        {
          key: String,
          label: String,
          description: String,
          fix: String,
          severity: { type: String, enum: ['critical', 'warning'] },
        },
      ],
      default: [],
    },

    wordCount: { type: Number, default: 0 },
    lowText: { type: Boolean, default: false },

    // ── Gemini AI Intelligence Layer ──────────────────────────────────
    // Populated after Gemini analyzes parsed data against the target role.
    // Django parsing runs first; Gemini adds role-specific intelligence on top.
    roleFitScore: { type: Number, default: null },
    keyGaps: { type: [String], default: [] },
    strengthAreas: { type: [String], default: [] },
    atsKeywordsMissing: { type: [String], default: [] },
    aiRecommendations: { type: [String], default: [] },
    nextStepPriority: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Resume = mongoose.model('Resume', resumeSchema);
