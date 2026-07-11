import { getLiveJobs, invalidateLiveJobsCache } from '../services/liveJobs.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

/**
 * GET /api/live-jobs?role=<targetRole>&country=<countryCode>
 *
 * Returns up to 8 live job openings sourced from TheirStack.
 * Results are cached per (role, country) for 6 hours across both the
 * in-memory layer (L1) and MongoDB (L2).  MongoDB persistence means
 * the cache survives server restarts and deployments.
 */
export const getJobOpenings = asyncHandler(async (req, res) => {
  const role    = (req.query.role    || '').trim();
  const country = (req.query.country || 'IN').trim().toUpperCase();

  if (!role) {
    throw ApiError.badRequest('Query parameter "role" is required');
  }

  const result = await getLiveJobs(role, country);

  return sendSuccess(res, {
    data: {
      jobs:       result.jobs,
      role,
      country,
      fromCache:  result.fromCache,
      cacheLayer: result.cacheLayer,
      fetchedAt:  result.fetchedAt,
      count:      result.jobs.length,
    },
  });
});

/**
 * DELETE /api/live-jobs/cache?role=<targetRole>&country=<countryCode>
 *
 * Admin-only: invalidate both in-memory and DB cache for a role so the
 * next request fetches fresh data from TheirStack.
 */
export const invalidateCache = asyncHandler(async (req, res) => {
  const role    = (req.query.role    || '').trim();
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
