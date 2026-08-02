/**
 * models/LiveJobCache.js — TheirStack Live Job Results MongoDB Cache
 *
 * WHAT THIS MODEL STORES:
 * Live job openings fetched from the TheirStack API, cached per (role, countryCode).
 * This avoids hitting the TheirStack API on every client request (which would:
 *   1. Be slow (external HTTP calls)
 *   2. Burn paid API credits (TheirStack uses credit-based pricing)
 *   3. Risk hitting rate limits)
 *
 * TWO-LAYER CACHING STRATEGY:
 * liveJobs.service.js uses two caches stacked on top of each other:
 *
 *   Layer 1 — In-Memory Map (fastest, reset on server restart):
 *     A JavaScript Map<string, {jobs, timestamp}> in the service module's closure.
 *     Hit rate ≈ 100% for the same role requested multiple times per session.
 *
 *   Layer 2 — MongoDB TTL Document (survives restarts, shared across instances):
 *     This model. Checked when the in-memory cache is empty (server restart).
 *     Populated when the API is actually called; invalidated by MongoDB TTL.
 *
 * CACHE TTL:
 * 6 hours (CACHE_TTL_SECONDS = 21600). MongoDB's TTL index automatically
 * DELETES documents where fetchedAt is older than 6 hours.
 * The in-memory cache also uses 6 hours as its expiry threshold.
 * These must stay in sync for consistent behavior.
 *
 * CACHE KEY:
 * (role, countryCode) pair — one cache entry per role per country.
 * Enforced by the unique index on { role: 1, countryCode: 1 }.
 *
 * CACHE INVALIDATION:
 * DELETE /api/live-jobs/cache (admin-only) calls liveJobs.service.js → clearCache()
 * which deletes the MongoDB document + clears the in-memory map.
 * The next request will re-fetch from TheirStack.
 *
 * JOB SCHEMA:
 * Normalized fields from TheirStack's response format.
 * Normalization removes TheirStack-specific field names so the client API
 * can use consistent field names regardless of the data source.
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

// Cache time-to-live in seconds — 6 hours.
// MongoDB's TTL index uses this to auto-expire documents.
// The in-memory cache in liveJobs.service.js uses the same value.
const CACHE_TTL_SECONDS = 6 * 60 * 60; // 6 hours = 21,600 seconds

/**
 * Schema for one normalized job listing.
 * { _id: false } — Jobs are embedded in the cache document and accessed by index.
 */
const jobSchema = new Schema(
  {
    // TheirStack's unique ID for this job posting (used for deduplication)
    id:        { type: String, required: true },

    // Job title (e.g. 'Senior Full Stack Developer')
    title:     { type: String, default: '' },

    // Company name (e.g. 'Zomato', 'PhonePe', 'Google India')
    company:   { type: String, default: '' },

    // Job location (e.g. 'Bangalore, India', 'Remote')
    location:  { type: String, default: '' },

    // Minimum salary from the listing (in the currency of the country)
    // null if the listing doesn't disclose salary
    salaryMin: { type: Number, default: null },

    // Maximum salary from the listing
    // null if the listing doesn't disclose salary
    salaryMax: { type: Number, default: null },

    // Salary currency code (e.g. 'INR', 'USD')
    salaryCurrency: { type: String, default: null },

    // Seniority level (e.g. 'Junior', 'Mid', 'Senior', 'Lead')
    // null if not specified in the listing
    seniority: { type: String, default: null },

    // ISO date string of when the job was posted (e.g. '2026-07-20T10:30:00Z')
    postedAt:  { type: String, default: null },

    // Human-readable relative time (e.g. '3 days ago', '1 week ago')
    // Pre-computed by liveJobs.service.js using the postedAt timestamp
    postedAgo: { type: String, default: null },

    // URL to apply for this job (shown as "Apply" button in the UI)
    applyUrl:  { type: String, default: null },
  },
  { _id: false }
);

/**
 * Main LiveJobCache schema — the `livejobcaches` collection in MongoDB.
 */
const liveJobCacheSchema = new Schema(
  {
    // Normalized, lowercase role search string (e.g. 'full stack developer')
    // Lowercasing ensures 'Full Stack Developer' and 'full stack developer' hit the same cache
    role: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    // ISO-3166-1 alpha-2 country code in lowercase (e.g. 'in' for India, 'us' for USA)
    // Allows the same role to be cached separately per country
    countryCode: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      default: 'in', // India is the primary market for PathPilot AI
    },

    // The cached array of normalized job listings for this (role, countryCode) pair
    // Array length is capped by liveJobs.service.js (typically 20–50 jobs)
    jobs: { type: [jobSchema], default: [] },

    /**
     * TTL anchor timestamp — set to Date.now() every time this document is written.
     * MongoDB's TTL index fires CACHE_TTL_SECONDS after this timestamp and deletes the document.
     *
     * IMPORTANT: Every upsert must include fetchedAt: new Date() to reset the TTL clock.
     * Without this, a refreshed cache would expire based on the ORIGINAL fetchedAt,
     * potentially expiring immediately after a refresh if the original was old.
     */
    fetchedAt: {
      type: Date,
      required: true,
      default: Date.now, // Function reference — called on document creation
    },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────────────

// Unique lookup index — one cache entry per (role, countryCode) combination.
// Enables efficient upserts: findOneAndUpdate({ role, countryCode }, ..., { upsert: true })
liveJobCacheSchema.index({ role: 1, countryCode: 1 }, { unique: true });

// MongoDB TTL index — MongoDB's background TTL monitor runs every 60 seconds
// and deletes documents where fetchedAt + CACHE_TTL_SECONDS < now.
// This is automatic — no cron job or cleanup logic needed in the application code.
liveJobCacheSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: CACHE_TTL_SECONDS });

export const LiveJobCache = mongoose.model('LiveJobCache', liveJobCacheSchema);
