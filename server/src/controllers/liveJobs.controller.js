/**
 * controllers/liveJobs.controller.js — Live Job Openings Controller (TheirStack API)
 *
 * ARCHITECTURAL ROLE:
 * Handles live job opening queries using the two-layer caching pipeline (Memory -> MongoDB TTL -> TheirStack API):
 * 1. `getJobOpenings`: Returns up to 8 live job postings for a role and country code string.
 * 2. `invalidateCache`: Admin-only endpoint purging both L1 Memory and L2 MongoDB cache layers for a role.
 */

import { getLiveJobs, invalidateLiveJobsCache } from '../services/liveJobs.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

/**
 * GET /api/live-jobs?role=<targetRole>&country=<countryCode>
 * Sources live job openings for target role and country from TheirStack API / cache.
 */
export const getJobOpenings = asyncHandler(async (req, res) => {
  const role = (req.query.role || '').trim();
  const country = (req.query.country || 'IN').trim().toUpperCase();

  if (!role) {
    throw ApiError.badRequest('Query parameter "role" is required');
  }

  const result = await getLiveJobs(role, country);

  return sendSuccess(res, {
    data: {
      jobs: result.jobs,
      role,
      country,
      fromCache: result.fromCache,
      cacheLayer: result.cacheLayer,
      fetchedAt: result.fetchedAt,
      count: result.jobs.length,
    },
  });
});

/**
 * DELETE /api/live-jobs/cache?role=<targetRole>&country=<countryCode>
 * Admin-only: Forces cache invalidation for a specific role and country.
 */
export const invalidateCache = asyncHandler(async (req, res) => {
  const role = (req.query.role || '').trim();
  const country = (req.query.country || 'IN').trim().toUpperCase();

  if (!role) {
    throw ApiError.badRequest('Query parameter "role" is required');
  }

  await invalidateLiveJobsCache(role, country);

  return sendSuccess(res, {
    message: `Cache invalidated for "${role}" (${country}). Next request will fetch from TheirStack.`,
    data: { role, country },
  });
});
