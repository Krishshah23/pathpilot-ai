import axios from 'axios';
import { env } from '../config/env.js';
import { LiveJobCache } from '../models/LiveJobCache.js';

/*
  Live job openings service — powered by the TheirStack Job Search API.
  https://api.theirstack.com/v1/jobs/search

  Free tier: 200 credits/month where 1 job returned = 1 credit consumed.

  Cache strategy — two layers to protect quota AND survive restarts:
    L1 (in-memory Map): sub-millisecond, lost on restart — TTL 6 h
    L2 (MongoDB):       persists across restarts/deploys — TTL index 6 h

  Read path:  L1 hit → return · L1 miss → L2 hit → warm L1, return
                                          · L2 miss → call API → write L1 + L2
  Write path: always write both layers so they stay in sync.
*/

// ── L1 in-memory cache ───────────────────────────────────────────────

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/** @type {Map<string, { jobs: object[], fetchedAt: number }>} */
const memCache = new Map();

function cacheKey(role, countryCode) {
  return `${role.toLowerCase()}::${countryCode.toLowerCase()}`;
}

// ── TheirStack API client ────────────────────────────────────────────

const THEIRSTACK_URL = 'https://api.theirstack.com/v1/jobs/search';
const DEFAULT_COUNTRY = 'IN';
const DEFAULT_LIMIT   = 8;

/**
 * POST to the TheirStack API and return the raw job array (or [] on error).
 * `posted_at_max_age_days` is REQUIRED by the API — always included.
 */
async function fetchFromApi(role, countryCode = DEFAULT_COUNTRY, limit = DEFAULT_LIMIT) {
  if (!env.theirstack.apiKey) {
    console.warn('[LiveJobs] THEIRSTACK_API_KEY not set — skipping fetch.');
    return [];
  }

  try {
    const { data } = await axios.post(
      THEIRSTACK_URL,
      {
        job_title_or:           [role],
        job_country_code_or:    [countryCode],
        posted_at_max_age_days: 30,
        limit,
      },
      {
        headers: {
          Authorization:  `Bearer ${env.theirstack.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15_000,
      }
    );

    const raw = Array.isArray(data) ? data : (data?.data ?? []);
    return raw;
  } catch (err) {
    const status  = err?.response?.status;
    const message = err?.response?.data?.message || err.message;
    console.error(`[LiveJobs] TheirStack API error (${status}): ${message}`);
    return [];
  }
}

// ── Job normalizer ───────────────────────────────────────────────────

/** Converts elapsed days into a human-readable label. */
function daysAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  return `${diff} days ago`;
}

/**
 * Normalise a raw TheirStack job object into the shape the frontend expects.
 * Field names confirmed against live API response (2026-07-12).
 */
function normalizeJob(raw) {
  // Apply URL — prefer final_url (resolved redirect), fall back to source_url
  const applyUrl =
    raw.final_url  ||
    raw.url        ||
    raw.source_url ||
    null;

  // Salary — TheirStack uses min/max_annual_salary (raw currency units)
  const salaryMin = raw.min_annual_salary ?? raw.salary_min ?? null;
  const salaryMax = raw.max_annual_salary ?? raw.salary_max ?? null;

  // Seniority string: 'junior' | 'mid_level' | 'senior' | …
  const seniority = raw.seniority ?? raw.experience_level ?? null;

  // Location — short_location is most reliable; fall back through the chain
  const locationFromArray =
    raw.locations?.[0]?.city         ||
    raw.locations?.[0]?.display_name ||
    raw.cities?.[0]                  ||
    null;

  const location =
    raw.short_location ||
    raw.long_location  ||
    raw.location       ||
    locationFromArray  ||
    (raw.remote ? 'Remote' : null) ||
    (raw.hybrid ? 'Hybrid' : null) ||
    null;

  // Company name — may be in nested company_object
  const company =
    raw.company_object?.name                        ||
    raw.company_name                                ||
    (typeof raw.company === 'string' ? raw.company : null) ||
    'Unknown company';

  const postedAt = raw.date_posted ?? raw.posted_at ?? raw.discovered_at ?? null;

  return {
    id:        raw.id ?? String(Math.random()),
    title:     raw.job_title ?? raw.title ?? raw.normalized_title ?? 'Untitled',
    company,
    location:  location || 'Location not specified',
    salaryMin: salaryMin !== null ? Number(salaryMin) : null,
    salaryMax: salaryMax !== null ? Number(salaryMax) : null,
    seniority: seniority || null,
    postedAt,
    postedAgo: daysAgo(postedAt),
    applyUrl,
  };
}

// ── L2 MongoDB helpers ───────────────────────────────────────────────

/** Read from MongoDB cache. Returns null if not found or expired. */
async function readDbCache(role, countryCode) {
  try {
    const doc = await LiveJobCache.findOne({
      role:        role.toLowerCase(),
      countryCode: countryCode.toLowerCase(),
    }).lean();

    if (!doc) return null;

    // Double-check TTL in code (MongoDB TTL index can lag up to ~60 s)
    const age = Date.now() - new Date(doc.fetchedAt).getTime();
    if (age > CACHE_TTL_MS) return null;

    return { jobs: doc.jobs, fetchedAt: new Date(doc.fetchedAt) };
  } catch (err) {
    // DB unavailable — gracefully degrade to API call
    console.warn('[LiveJobs] DB cache read failed:', err.message);
    return null;
  }
}

/** Write jobs to MongoDB cache, upserting the (role, countryCode) document. */
async function writeDbCache(role, countryCode, jobs) {
  try {
    await LiveJobCache.findOneAndUpdate(
      {
        role:        role.toLowerCase(),
        countryCode: countryCode.toLowerCase(),
      },
      {
        jobs,
        fetchedAt: new Date(),
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    // Non-fatal — we still have the in-memory result to return
    console.warn('[LiveJobs] DB cache write failed:', err.message);
  }
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Returns up to `limit` normalized live job openings for `role`.
 *
 * Cache read order: L1 (in-memory) → L2 (MongoDB) → TheirStack API
 * Cache write order (on miss): TheirStack API → L1 + L2
 *
 * @param {string} role
 * @param {string} [countryCode='IN']
 * @param {number} [limit=8]
 * @returns {Promise<{ jobs: object[], fromCache: boolean, cacheLayer: string|null, fetchedAt: Date }>}
 */
export async function getLiveJobs(role, countryCode = DEFAULT_COUNTRY, limit = DEFAULT_LIMIT) {
  const key = cacheKey(role, countryCode);

  // ── L1: in-memory hit ──
  const memEntry = memCache.get(key);
  if (memEntry && Date.now() - memEntry.fetchedAt < CACHE_TTL_MS) {
    return {
      jobs:       memEntry.jobs.slice(0, limit),
      fromCache:  true,
      cacheLayer: 'memory',
      fetchedAt:  new Date(memEntry.fetchedAt),
    };
  }

  // ── L2: MongoDB hit ──
  const dbEntry = await readDbCache(role, countryCode);
  if (dbEntry) {
    // Warm the L1 cache so subsequent requests this server lifetime skip DB
    memCache.set(key, { jobs: dbEntry.jobs, fetchedAt: dbEntry.fetchedAt.getTime() });
    return {
      jobs:       dbEntry.jobs.slice(0, limit),
      fromCache:  true,
      cacheLayer: 'db',
      fetchedAt:  dbEntry.fetchedAt,
    };
  }

  // ── L3: TheirStack API ──
  const raw  = await fetchFromApi(role, countryCode, limit);
  const jobs = raw.map(normalizeJob);
  const now  = Date.now();

  // Write both cache layers (non-blocking for DB)
  memCache.set(key, { jobs, fetchedAt: now });
  writeDbCache(role, countryCode, jobs); // intentionally not awaited

  return {
    jobs:       jobs.slice(0, limit),
    fromCache:  false,
    cacheLayer: null,
    fetchedAt:  new Date(now),
  };
}

/**
 * Manually invalidate both cache layers for a specific (role, countryCode).
 * Useful in tests or an admin "force refresh" endpoint.
 */
export async function invalidateLiveJobsCache(role, countryCode = DEFAULT_COUNTRY) {
  const key = cacheKey(role, countryCode);
  memCache.delete(key);

  try {
    await LiveJobCache.deleteOne({
      role:        role.toLowerCase(),
      countryCode: countryCode.toLowerCase(),
    });
  } catch (err) {
    console.warn('[LiveJobs] Cache invalidation DB error:', err.message);
  }
}
