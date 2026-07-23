/**
 * models/Opportunity.js — Job Application Kanban Mongoose Model
 *
 * WHAT THIS MODEL STORES:
 * Each document is one job/internship opportunity tracked by a student.
 * Opportunities move through a defined pipeline of stages and maintain
 * a full timeline of stage transitions.
 *
 * KANBAN BOARD MAPPING:
 * The `stage` field drives the Kanban board columns in ExecutionEnginePage.
 * Each stage = one column, and cards move between columns via PATCH requests.
 *
 * STAGES:
 * wishlist → applied → oa → interview → hr → offer → rejected
 *   ↑ Tracking:  Student saves the job for later consideration
 *   ↑ Applied:   Student submitted the application
 *   ↑ OA:        Online Assessment / coding test
 *   ↑ Interview: Technical interview rounds
 *   ↑ HR:        HR/compensation discussion
 *   ↑ Offer:     Offer received (🎉)
 *   ↑ Rejected:  Application declined
 *
 * TIMELINE TRACKING:
 * Every time the stage changes, a timelineEntrySchema document is pushed to
 * the timeline array with the new stage, timestamp, and optional note.
 * This creates a complete audit trail of the application journey.
 *
 * FIT SCORE:
 * When creating/updating an opportunity, opportunity.controller.js computes
 * a fit score by comparing the opportunity's role against the student's
 * latest resume analysis (roleFitScore, atsPass probability, interview success).
 * This helps students prioritize which opportunities match them best.
 *
 * COMPOUND INDEX:
 * { user: 1, updatedAt: -1 } allows efficient queries like:
 *   "Get all of my opportunities, most recently updated first"
 * which is the main query used to populate the Kanban board.
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * The ordered stages of a job application pipeline.
 * Exported so opportunity.controller.js and ExecutionEnginePage.jsx can use the same list.
 */
export const OPPORTUNITY_STAGES = [
  'wishlist',    // Saved for consideration
  'applied',     // Application submitted
  'oa',          // Online assessment / coding challenge
  'interview',   // Technical interview round(s)
  'hr',          // HR / compensation round
  'offer',       // Offer received
  'rejected',    // Application unsuccessful
];

/**
 * One entry in the stage-change timeline.
 * Created automatically each time the opportunity's stage changes.
 *
 * { _id: false } — Timeline entries are embedded and accessed by index, not by _id.
 */
const timelineEntrySchema = new Schema(
  {
    // Which stage was entered (e.g. 'interview')
    stage: { type: String, enum: OPPORTUNITY_STAGES, required: true },

    // When the stage was entered (default = now)
    date: { type: Date, default: Date.now },

    // Optional note the student can attach (e.g. 'Technical round with CTO team')
    note: { type: String, default: '' },
  },
  { _id: false }
);

/**
 * Main Opportunity schema — the `opportunities` collection in MongoDB.
 */
const opportunitySchema = new Schema(
  {
    // The student who owns this opportunity card
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // Part of compound index below; also enables single-field queries
    },

    // ── Job details ────────────────────────────────────────────────────────────

    // Company name (e.g. 'Google', 'Zepto', 'Swiggy')
    company: { type: String, required: true, trim: true },

    // Job/internship role title (e.g. 'Backend Developer Intern')
    role: { type: String, required: true, trim: true },

    // Current pipeline stage — drives the Kanban column this card appears in
    stage: {
      type: String,
      enum: OPPORTUNITY_STAGES,
      default: 'wishlist', // New cards start in wishlist
    },

    // Job posting URL (for Apply button in the Live Jobs tab)
    url: { type: String, trim: true, default: '' },

    // Student's personal notes about this opportunity
    notes: { type: String, trim: true, default: '' },

    // Salary/stipend details (free text, e.g. '12 LPA', '₹25,000/month')
    salary: { type: String, trim: true, default: '' },

    // Job location (e.g. 'Bangalore', 'Remote', 'Hybrid - Delhi')
    location: { type: String, trim: true, default: '' },

    // When the application was submitted (set when stage changes to 'applied')
    appliedAt: { type: Date, default: null },

    // ── Stage History ─────────────────────────────────────────────────────────

    // Ordered list of stage transitions (newest last)
    // Each push happens in opportunity.controller.js → updateOpportunity()
    timeline: { type: [timelineEntrySchema], default: [] },

    // ── AI Fit Score ───────────────────────────────────────────────────────────
    // Computed by opportunity.controller.js using the student's latest ML predictions.
    // Helps students understand how well-matched they are for each opportunity.
    fitScore: {
      // Composite match score (0–100) — weighted average of the three sub-scores
      score: { type: Number, default: 0 },

      // How well the student's resume fits this role (from Gemini role-fit analysis)
      roleFit: { type: Number, default: 0 },

      // ATS pass probability (from XGBoost ATS model) — likelihood the resume
      // gets past the automated screening system for this kind of role
      atsPass: { type: Number, default: 0 },

      // Predicted interview success probability (from Random Forest interview model)
      interviewSuccess: { type: Number, default: 0 },

      // Confidence metadata for the fit score calculation
      confidence: {
        // 'high': enough data to trust the score
        // 'moderate': some data missing but reasonable estimate
        // 'low': very little data — score is speculative
        tier: { type: String, enum: ['high', 'moderate', 'low'], default: 'moderate' },

        // Numeric confidence value (0–100)
        score: { type: Number, default: 50 },

        // Human-readable explanation of the confidence level
        reason: { type: String, default: '' },
      },
    },
  },
  { timestamps: true } // createdAt = when card was added, updatedAt = last stage change
);

// ── Compound Index ─────────────────────────────────────────────────────────────
// Optimizes the main Kanban board query:
//   Opportunity.find({ user: userId }).sort({ updatedAt: -1 })
// Without this index, MongoDB does a full collection scan which becomes slow
// as the opportunities collection grows across many users.
opportunitySchema.index({ user: 1, updatedAt: -1 });

export const Opportunity = mongoose.model('Opportunity', opportunitySchema);
