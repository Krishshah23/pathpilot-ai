import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Persists TheirStack live-job results per (role, countryCode) so the
 * 6-hour in-memory cache survives server restarts and deployments.
 *
 * TTL index: MongoDB auto-purges documents older than CACHE_TTL_SECONDS
 * (6 hours), matching the in-memory cache lifetime exactly.
 */

const CACHE_TTL_SECONDS = 6 * 60 * 60; // 6 hours

const jobSchema = new Schema(
  {
    id:        { type: String, required: true },
    title:     { type: String, default: '' },
    company:   { type: String, default: '' },
    location:  { type: String, default: '' },
    salaryMin: { type: Number, default: null },
    salaryMax: { type: Number, default: null },
    seniority: { type: String, default: null },
    postedAt:  { type: String, default: null },
    postedAgo: { type: String, default: null },
    applyUrl:  { type: String, default: null },
  },
  { _id: false }
);

const liveJobCacheSchema = new Schema(
  {
    /** Cache key: lowercase role string (e.g. "full stack developer"). */
    role: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    /** ISO-3166-1 alpha-2 country code, lowercase (e.g. "in"). */
    countryCode: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      default: 'in',
    },

    /** Normalized job objects returned by the TheirStack API. */
    jobs: { type: [jobSchema], default: [] },

    /**
     * TTL anchor field.  MongoDB's TTL index fires CACHE_TTL_SECONDS after
     * this timestamp, automatically deleting the document.  We set it to
     * `Date.now()` on every upsert so refreshing a role resets the clock.
     */
    fetchedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Unique lookup index — one cache entry per (role, countryCode) pair.
liveJobCacheSchema.index({ role: 1, countryCode: 1 }, { unique: true });

// MongoDB TTL index — documents are removed automatically after 6 hours.
liveJobCacheSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: CACHE_TTL_SECONDS });

export const LiveJobCache = mongoose.model('LiveJobCache', liveJobCacheSchema);
