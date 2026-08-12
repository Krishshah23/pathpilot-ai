/**
 * services/liveJobs.service.js — Real-Time Job Openings Service (TheirStack API)
 *
 * ARCHITECTURAL PURPOSE & BUDGET-RESTRICTION STRATEGY:
 * Fetches active job openings via TheirStack API (`https://api.theirstack.com/v1/jobs/search`).
 * Strictly protects credit consumption (200 free tier requests/mo · 8 credits/request = max 25 calls)
 * using a MULTI-TIER CACHE & USAGE BUDGET PIPELINE:
 *
 * 1. LAYER 1 (In-Memory Map):
 *    - Fast read access, stored in module scope.
 *    - Default validity: 72 hours (`CACHE_TTL_MS`).
 *
 * 2. LAYER 2 (MongoDB `LiveJobCache`):
 *    - Survives server restarts and multi-node deployments.
 *    - Documents retained for up to 30 days to provide graceful stale-fallback if credit limit is reached.
 *
 * 3. BUDGET & QUOTA ENFORCEMENT (`ApiCreditUsage`):
 *    - Tracks monthly usage counter (monthKey: 'YYYY-MM').
 *    - Prevents any external API call if remaining credits < 8 or limit is reached.
 *
 * 4. GRACEFUL STALE & CURATED FALLBACK:
 *    - If API key is unset, credits are exhausted, or network fails, the service returns stale
 *      DB cache or realistic role-tailored job listings so UI remains 100% operational.
 */

import axios from 'axios';
import { env } from '../config/env.js';
import { LiveJobCache } from '../models/LiveJobCache.js';
import { ApiCreditUsage } from '../models/ApiCreditUsage.js';

// ── Cache Configuration ─────────────────────────────────────────────
const CACHE_TTL_MS = (env.theirstack.cacheTtlHours || 72) * 60 * 60 * 1000;

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

/** Converts an ISO date string into relative "X days ago" or "Today". */
function daysAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return '1 day ago';
  return `${diff} days ago`;
}

/**
 * Normalizes raw TheirStack job object properties into standardized client fields.
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
    id: String(raw.id ?? Math.random().toString(36).substring(2, 9)),
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

/**
 * Realistic curated fallback jobs generator for zero-user / dev / exhausted quota scenarios.
 */
function generateFallbackJobs(role, countryCode = DEFAULT_COUNTRY, limit = DEFAULT_LIMIT) {
  const isIndia = countryCode.toUpperCase() === 'IN';
  const currency = isIndia ? 'INR' : 'USD';

  const techHubs = isIndia
    ? ['Bangalore, India', 'Hyderabad, India', 'Pune, India', 'Gurgaon, India', 'Remote, India', 'Mumbai, India']
    : ['San Francisco, CA', 'New York, NY', 'Austin, TX', 'Remote, US', 'Seattle, WA'];

  const companies = isIndia
    ? ['Razorpay', 'Swiggy', 'Zomato', 'PhonePe', 'Flipkart', 'Cred', 'Postman', 'Juspay']
    : ['Stripe', 'Airbnb', 'Notion', 'Figma', 'Datadog', 'Vercel', 'Linear', 'Coinbase'];

  const titles = [
    `Senior ${role}`,
    `${role}`,
    `Lead ${role}`,
    `Staff ${role}`,
    `Junior ${role}`,
    `Associate ${role}`,
    `Principal ${role}`,
    `${role} (Platform)`,
  ];

  const now = Date.now();
  const list = [];

  for (let i = 0; i < Math.min(limit, titles.length); i++) {
    const days = i * 2;
    const postedDate = new Date(now - days * 86400000).toISOString();
    const baseSalaryMin = isIndia ? (12 + (i % 5) * 4) * 100000 : (100 + (i % 5) * 20) * 1000;
    const baseSalaryMax = isIndia ? baseSalaryMin + 800000 : baseSalaryMin + 40000;
    const seniority = i === 0 || i === 2 ? 'Senior' : i === 4 ? 'Junior' : 'Mid';

    list.push({
      id: `curated-${role.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i + 1}`,
      title: titles[i],
      company: companies[i % companies.length],
      location: techHubs[i % techHubs.length],
      salaryMin: baseSalaryMin,
      salaryMax: baseSalaryMax,
      salaryCurrency: currency,
      seniority,
      postedAt: postedDate,
      postedAgo: days === 0 ? 'Today' : `${days} days ago`,
      applyUrl: `https://www.google.com/search?q=${encodeURIComponent(`${titles[i]} ${companies[i % companies.length]} careers`)}`,
    });
  }

  return list;
}

/** Reads L2 cache from MongoDB. Returns doc and age. */
async function readDbCache(role, countryCode) {
  try {
    const doc = await LiveJobCache.findOne({
      role: role.toLowerCase(),
      countryCode: countryCode.toLowerCase(),
    }).lean();

    if (!doc || !Array.isArray(doc.jobs) || doc.jobs.length === 0) return null;

    const ageMs = Date.now() - new Date(doc.fetchedAt).getTime();
    const isFresh = ageMs <= CACHE_TTL_MS;

    return {
      jobs: doc.jobs,
      fetchedAt: new Date(doc.fetchedAt),
      isFresh,
      ageMs,
    };
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
 * Makes an HTTP POST request to the TheirStack API if credit budget permits.
 * @param {string} role - Target job title
 * @param {string} [countryCode='IN'] - ISO 2-letter country code
 * @param {number} [limit=8] - Maximum listings to fetch
 * @param {object} [options={}] - Options e.g. { source: 'user_request' }
 * @returns {Promise<{ raw: Array<object>, quotaBlocked?: boolean }>}
 */
async function fetchFromApi(role, countryCode = DEFAULT_COUNTRY, limit = DEFAULT_LIMIT, options = {}) {
  if (!env.theirstack.apiKey) {
    // eslint-disable-next-line no-console
    console.warn('[LiveJobs] THEIRSTACK_API_KEY not set — skipping external fetch.');
    return { raw: [] };
  }

  const cost = env.theirstack.creditsPerRequest || 8;
  const maxCredits = env.theirstack.monthlyCreditLimit || 200;

  // Check quota ledger before burning credits
  const quotaCheck = await ApiCreditUsage.canConsume('theirstack', cost, maxCredits);
  if (!quotaCheck.allowed) {
    // eslint-disable-next-line no-console
    console.warn(
      `[LiveJobs] Monthly TheirStack credit budget reached (${quotaCheck.currentUsed}/${maxCredits} credits). Blocking external API call.`
    );
    return { raw: [], quotaBlocked: true };
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

    // Successfully called API — record credit consumption in MongoDB
    await ApiCreditUsage.recordConsumption('theirstack', cost, {
      role,
      country: countryCode,
      source: options.source || 'user_request',
    });

    return { raw };
  } catch (err) {
    const status = err?.response?.status;
    const message = err?.response?.data?.message || err.message;
    // eslint-disable-next-line no-console
    console.error(`[LiveJobs] TheirStack API error (${status}): ${message}`);
    return { raw: [] };
  }
}

/**
 * High-level retrieval method with multi-tier cache & credit restriction.
 *
 * @param {string} role - Target job title
 * @param {string} [countryCode='IN'] - Country code
 * @param {number} [limit=8] - Result cap
 * @param {object} [options={}] - Options { allowExternalFetch?: boolean, source?: string }
 * @returns {Promise<{
 *   jobs: Array<object>,
 *   fromCache: boolean,
 *   cacheLayer: string|null,
 *   fetchedAt: Date,
 *   quotaStatus: object
 * }>}
 */
export async function getLiveJobs(
  role,
  countryCode = DEFAULT_COUNTRY,
  limit = DEFAULT_LIMIT,
  options = {}
) {
  const key = cacheKey(role, countryCode);
  const maxCredits = env.theirstack.monthlyCreditLimit || 200;
  const allowExternal = options.allowExternalFetch !== false;

  // ── Layer 1: In-memory Map hit (Fresh) ──
  const memEntry = memCache.get(key);
  if (memEntry && Date.now() - memEntry.fetchedAt < CACHE_TTL_MS) {
    const quotaStatus = await ApiCreditUsage.getMonthlyUsage('theirstack', maxCredits);
    return {
      jobs: memEntry.jobs.slice(0, limit),
      fromCache: true,
      cacheLayer: 'memory',
      fetchedAt: new Date(memEntry.fetchedAt),
      quotaStatus,
    };
  }

  // ── Layer 2: MongoDB cache hit (Fresh) ──
  const dbEntry = await readDbCache(role, countryCode);
  if (dbEntry && dbEntry.isFresh) {
    memCache.set(key, { jobs: dbEntry.jobs, fetchedAt: dbEntry.fetchedAt.getTime() });
    const quotaStatus = await ApiCreditUsage.getMonthlyUsage('theirstack', maxCredits);
    return {
      jobs: dbEntry.jobs.slice(0, limit),
      fromCache: true,
      cacheLayer: 'db',
      fetchedAt: dbEntry.fetchedAt,
      quotaStatus,
    };
  }

  // If external fetch is explicitly disallowed or API key not present
  if (!allowExternal || !env.theirstack.apiKey) {
    if (dbEntry && dbEntry.jobs.length > 0) {
      const quotaStatus = await ApiCreditUsage.getMonthlyUsage('theirstack', maxCredits);
      return {
        jobs: dbEntry.jobs.slice(0, limit),
        fromCache: true,
        cacheLayer: 'db-stale',
        fetchedAt: dbEntry.fetchedAt,
        quotaStatus,
      };
    }

    const fallbackJobs = generateFallbackJobs(role, countryCode, limit);
    const quotaStatus = await ApiCreditUsage.getMonthlyUsage('theirstack', maxCredits);
    return {
      jobs: fallbackJobs,
      fromCache: true,
      cacheLayer: 'fallback',
      fetchedAt: new Date(),
      quotaStatus,
    };
  }

  // ── Layer 3: External TheirStack API (Budget Protected) ──
  const { raw, quotaBlocked } = await fetchFromApi(role, countryCode, limit, options);

  if (raw && raw.length > 0) {
    const jobs = raw.map(normalizeJob);
    const now = Date.now();

    memCache.set(key, { jobs, fetchedAt: now });
    writeDbCache(role, countryCode, jobs);

    const quotaStatus = await ApiCreditUsage.getMonthlyUsage('theirstack', maxCredits);
    return {
      jobs: jobs.slice(0, limit),
      fromCache: false,
      cacheLayer: null,
      fetchedAt: new Date(now),
      quotaStatus,
    };
  }

  // If external API was blocked by quota or returned no data, serve stale DB cache or fallback
  if (dbEntry && dbEntry.jobs.length > 0) {
    const quotaStatus = await ApiCreditUsage.getMonthlyUsage('theirstack', maxCredits);
    return {
      jobs: dbEntry.jobs.slice(0, limit),
      fromCache: true,
      cacheLayer: quotaBlocked ? 'db-quota-preserved' : 'db-stale',
      fetchedAt: dbEntry.fetchedAt,
      quotaStatus,
    };
  }

  // If no DB cache exists at all, serve rich curated fallback
  const fallback = generateFallbackJobs(role, countryCode, limit);
  const quotaStatus = await ApiCreditUsage.getMonthlyUsage('theirstack', maxCredits);
  return {
    jobs: fallback,
    fromCache: true,
    cacheLayer: quotaBlocked ? 'fallback-quota-preserved' : 'fallback',
    fetchedAt: new Date(),
    quotaStatus,
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

/**
 * Returns diagnostic stats for live jobs caching & credit budget.
 */
export async function getLiveJobsDiagnosticStats() {
  const maxCredits = env.theirstack.monthlyCreditLimit || 200;
  const usage = await ApiCreditUsage.getMonthlyUsage('theirstack', maxCredits);
  const totalCachedRoles = await LiveJobCache.countDocuments();

  return {
    ...usage,
    totalCachedRoles,
    cacheTtlHours: env.theirstack.cacheTtlHours || 72,
    hasApiKey: Boolean(env.theirstack.apiKey),
  };
}
