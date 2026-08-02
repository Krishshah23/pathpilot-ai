/**
 * services/liveJobs.service.js — Real-Time Job Openings Service (TheirStack API)
 *
 * ARCHITECTURAL PURPOSE & CACHING:
 * Fetches active job openings via TheirStack API (`https://api.theirstack.com/v1/jobs/search`).
 * Protects credit consumption (200 free tier requests/mo) using a TWO-LAYER CACHING STRATEGY:
 *
 * LAYER 1 (In-Memory Map):
 * - Sub-millisecond read access, stored in module scope.
 * - Expires after 6 hours (`CACHE_TTL_MS`).
 *
 * LAYER 2 (MongoDB `LiveJobCache`):
 * - Survives server restarts and multi-node deployments.
 * - MongoDB TTL index automatically purges documents after 6 hours (`CACHE_TTL_SECONDS`).
 *
 * REQUEST PIPELINE:
 * 1. Check L1 Memory Cache → Return immediately if fresh.
 * 2. Check L2 MongoDB Cache → On hit, warm L1 Memory Cache and return.
 * 3. Cache Miss → Call TheirStack API → Normalize fields → Write to L1 + L2 Cache → Return.
 */

import axios from 'axios';
import { env } from '../config/env.js';
import { LiveJobCache } from '../models/LiveJobCache.js';

// ── L1 In-Memory Cache ──────────────────────────────────────────────
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

/** @type {Map<string, { jobs: Array<object>, fetchedAt: number }>} */
const memCache = new Map();

/** Builds a composite cache key from role and country code string. */
function cacheKey(role, countryCode) {
  return `${role.toLowerCase()}::${countryCode.toLowerCase()}`;
}

// ── TheirStack Client Constants ──────────────────────────────────────
const THEIRSTACK_URL = 'https://api.theirstack.com/v1/jobs/search';
const DEFAULT_COUNTRY = 'IN';
const DEFAULT_LIMIT = 8;

/**
 * Makes an HTTP POST request to the TheirStack API.
 * @param {string} role - Target job title
 * @param {string} [countryCode='IN'] - ISO 2-letter country code
 * @param {number} [limit=8] - Maximum listings to fetch
 * @returns {Promise<Array<object>>} Raw listing objects or []
 */
async function fetchFromApi(role, countryCode = DEFAULT_COUNTRY, limit = DEFAULT_LIMIT) {
  if (!env.theirstack.apiKey) {
    // eslint-disable-next-line no-console
    console.warn('[LiveJobs] THEIRSTACK_API_KEY not set — skipping fetch.');
    return [];
  }

  try {
    const { data } = await axios.post(
      THEIRSTACK_URL,
      {
        job_title_or: [role],
        job_country_code_or: [countryCode],
        posted_at_max_age_days: 30, // Required parameter
        limit,
      },
      {
        headers: {
          Authorization: `Bearer ${env.theirstack.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const raw = Array.isArray(data) ? data : data?.data ?? [];
    return raw;
  } catch (err) {
    const status = err?.response?.status;
    const message = err?.response?.data?.message || err.message;
    // eslint-disable-next-line no-console
    console.error(`[LiveJobs] TheirStack API error (${status}): ${message}`);
    return [];
  }
}

/** Converts an ISO date string into relative "X days ago" or "Today". */
function daysAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  return `${diff} days ago`;
}

/**
 * Normalizes raw TheirStack job object properties into standardized client fields.
 * Handles fallbacks for missing locations, companies, and apply URLs.
 * @param {object} raw - Raw API listing object
 * @returns {object} Normalized job object
 */
function normalizeJob(raw) {
  const applyUrl =
    raw.final_url ||
    raw.url ||
    raw.source_url ||
    null;

  const salaryMin = raw.min_annual_salary ?? raw.salary_min ?? null;
  const salaryMax = raw.max_annual_salary ?? raw.salary_max ?? null;
  const salaryCurrency = raw.salary_currency ?? raw.currency ?? null;
  const seniority = raw.seniority ?? raw.experience_level ?? null;

  const locationFromArray =
    raw.locations?.[0]?.city ||
    raw.locations?.[0]?.display_name ||
    raw.cities?.[0] ||
    null;

  const location =
    raw.short_location ||
    raw.long_location ||
    raw.location ||
    locationFromArray ||
    (raw.remote ? 'Remote' : null) ||
    (raw.hybrid ? 'Hybrid' : null) ||
    null;

  const company =
    raw.company_object?.name ||
    raw.company_name ||
    (typeof raw.company === 'string' ? raw.company : null) ||
    'Unknown company';

  const postedAt = raw.date_posted ?? raw.posted_at ?? raw.discovered_at ?? null;

  return {
    id: raw.id ?? String(Math.random()),
    title: raw.job_title ?? raw.title ?? raw.normalized_title ?? 'Untitled',
    company,
    location: location || 'Location not specified',
    salaryMin: salaryMin !== null ? Number(salaryMin) : null,
    salaryMax: salaryMax !== null ? Number(salaryMax) : null,
    salaryCurrency: salaryCurrency ? String(salaryCurrency).toUpperCase() : null,
    seniority: seniority || null,
    postedAt,
    postedAgo: daysAgo(postedAt),
    applyUrl,
  };
}

/** Reads L2 cache from MongoDB. */
async function readDbCache(role, countryCode) {
  try {
    const doc = await LiveJobCache.findOne({
      role: role.toLowerCase(),
      countryCode: countryCode.toLowerCase(),
    }).lean();

    if (!doc) return null;

    const age = Date.now() - new Date(doc.fetchedAt).getTime();
    if (age > CACHE_TTL_MS) return null;

    return { jobs: doc.jobs, fetchedAt: new Date(doc.fetchedAt) };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[LiveJobs] DB cache read failed:', err.message);
    return null;
  }
}

/** Writes fresh job listings to L2 MongoDB cache. */
async function writeDbCache(role, countryCode, jobs) {
  try {
    await LiveJobCache.findOneAndUpdate(
      {
        role: role.toLowerCase(),
        countryCode: countryCode.toLowerCase(),
      },
      {
        jobs,
        fetchedAt: new Date(),
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[LiveJobs] DB cache write failed:', err.message);
  }
}

/**
 * High-level retrieval method with two-tier cache checking.
 *
 * @param {string} role - Target job title
 * @param {string} [countryCode='IN'] - Country code
 * @param {number} [limit=8] - Result cap
 * @returns {Promise<{jobs: Array<object>, fromCache: boolean, cacheLayer: string|null, fetchedAt: Date}>}
 */
export async function getLiveJobs(role, countryCode = DEFAULT_COUNTRY, limit = DEFAULT_LIMIT) {
  const key = cacheKey(role, countryCode);

  // ── Layer 1: In-memory Map hit ──
  const memEntry = memCache.get(key);
  if (memEntry && Date.now() - memEntry.fetchedAt < CACHE_TTL_MS) {
    return {
      jobs: memEntry.jobs.slice(0, limit),
      fromCache: true,
      cacheLayer: 'memory',
      fetchedAt: new Date(memEntry.fetchedAt),
    };
  }

  // ── Layer 2: MongoDB TTL cache hit ──
  const dbEntry = await readDbCache(role, countryCode);
  if (dbEntry) {
    memCache.set(key, { jobs: dbEntry.jobs, fetchedAt: dbEntry.fetchedAt.getTime() });
    return {
      jobs: dbEntry.jobs.slice(0, limit),
      fromCache: true,
      cacheLayer: 'db',
      fetchedAt: dbEntry.fetchedAt,
    };
  }

  // ── Layer 3: External TheirStack API ──
  const raw = await fetchFromApi(role, countryCode, limit);
  const jobs = raw.map(normalizeJob);
  const now = Date.now();

  memCache.set(key, { jobs, fetchedAt: now });
  writeDbCache(role, countryCode, jobs); // Non-blocking asynchronous write

  return {
    jobs: jobs.slice(0, limit),
    fromCache: false,
    cacheLayer: null,
    fetchedAt: new Date(now),
  };
}

/**
 * Purges both L1 in-memory and L2 MongoDB cache for a role/country pair.
 * Used by admin endpoints or test suites.
 */
export async function invalidateLiveJobsCache(role, countryCode = DEFAULT_COUNTRY) {
  const key = cacheKey(role, countryCode);
  memCache.delete(key);

  try {
    await LiveJobCache.deleteOne({
      role: role.toLowerCase(),
      countryCode: countryCode.toLowerCase(),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[LiveJobs] Cache invalidation DB error:', err.message);
  }
}
