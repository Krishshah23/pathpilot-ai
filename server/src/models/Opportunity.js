import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Stages a job opportunity can move through. The order matches a typical
 * hiring pipeline so the frontend can render them left-to-right.
 */
export const OPPORTUNITY_STAGES = [
  'wishlist',
  'applied',
  'oa',        // online assessment
  'interview',
  'hr',
  'offer',
  'rejected',
];

/**
 * Each time the stage changes we push a timeline entry so the student can
 * visualize their journey with a particular opportunity.
 */
const timelineEntrySchema = new Schema(
  {
    stage: { type: String, enum: OPPORTUNITY_STAGES, required: true },
    date: { type: Date, default: Date.now },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const opportunitySchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    company: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },

    stage: {
      type: String,
      enum: OPPORTUNITY_STAGES,
      default: 'wishlist',
    },

    url: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    salary: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },

    appliedAt: { type: Date, default: null },

    timeline: { type: [timelineEntrySchema], default: [] },
  },
  { timestamps: true }
);

// Compound index for efficient per-user queries sorted by recency.
opportunitySchema.index({ user: 1, updatedAt: -1 });

export const Opportunity = mongoose.model('Opportunity', opportunitySchema);
