import {
  getMarketDataForRole,
  getMarketSalaryForRole,
  refreshAllRoles,
  TRACKED_ROLES,
} from '../services/jobMarket.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

/**
 * GET /api/job-market/:role
 * Returns the latest week's skill-frequency data and salary range for a role.
 */
export const getMarketData = asyncHandler(async (req, res) => {
  const { role } = req.params;
  if (!role) throw ApiError.badRequest('Role parameter is required');

  const market = await getMarketDataForRole(decodeURIComponent(role));

  return sendSuccess(res, {
    data: {
      ...market,
      trackedRoles: TRACKED_ROLES,
    },
  });
});

/**
 * GET /api/job-market/:role/salary
 * Returns the aggregate market salary range for a role.
 */
export const getMarketSalary = asyncHandler(async (req, res) => {
  const { role } = req.params;
  if (!role) throw ApiError.badRequest('Role parameter is required');

  const salary = await getMarketSalaryForRole(decodeURIComponent(role));

  return sendSuccess(res, { data: salary });
});

/**
 * POST /api/job-market/refresh   (admin-only)
 * Manually triggers a full market data refresh.
 */
export const triggerRefresh = asyncHandler(async (_req, res) => {
  const count = await refreshAllRoles();
  return sendSuccess(res, {
    message: `Market data refreshed. ${count} snapshots upserted.`,
    data: { snapshotsUpserted: count },
  });
});
