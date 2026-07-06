import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Stores weekly skill-frequency and salary-range snapshots from live job
 * listings. Populated by the scheduled Adzuna fetch job and consumed by
 * Gap Navigator (skill prioritization) and Salary Projector (market range).
 *
 * One document per (role, skill, weekOf) combination so queries are fast
 * and old weeks naturally accumulate for trend analysis.
 */
const jobMarketSnapshotSchema = new Schema(
  {
    role: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    skill: {
      type: String,
      required: true,
      trim: true,
    },
    /** Percentage of postings for this role that mention this skill. */
    frequency: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    /** Aggregate salary range from the listings (INR LPA). */
    avgSalaryRange: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
    },
    /** How many job postings were analyzed to derive this row. */
    sampleSize: {
      type: Number,
      default: 0,
    },
    /** Start-of-week date — allows weekly deduplication and trend queries. */
    weekOf: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index: fetch all skills for a role in a given week efficiently.
jobMarketSnapshotSchema.index({ role: 1, weekOf: -1 });
// Unique constraint so re-runs of the cron don't create duplicate rows.
jobMarketSnapshotSchema.index({ role: 1, skill: 1, weekOf: 1 }, { unique: true });

export const JobMarketSnapshot = mongoose.model('JobMarketSnapshot', jobMarketSnapshotSchema);
