/**
 * controllers/jobMarket.controller.js — Market Intelligence Controller
 *
 * ARCHITECTURAL ROLE:
 * Serves skill frequency demand percentages and salary range metrics queried from Adzuna job listings:
 * 1. `getMarketData`: Returns top skill demand percentages for a target role.
 * 2. `getMarketSalary`: Returns aggregate salary range (in INR LPA).
 * 3. `triggerRefresh`: Admin-only endpoint triggering immediate market data refresh.
 */

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
 * Returns market skill frequency demand percentages for a target role.
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
 * Returns aggregate market salary range (in INR LPA) for a role.
 */
export const getMarketSalary = asyncHandler(async (req, res) => {
  const { role } = req.params;
  if (!role) throw ApiError.badRequest('Role parameter is required');

  const salary = await getMarketSalaryForRole(decodeURIComponent(role));

  return sendSuccess(res, { data: salary });
});

/**
 * POST /api/job-market/refresh (admin-only)
 * Manually triggers a full market data refresh across all 12 tracked roles.
 */
export const triggerRefresh = asyncHandler(async (_req, res) => {
  const count = await refreshAllRoles();
  return sendSuccess(res, {
    message: `Market data refreshed. ${count} snapshots upserted.`,
    data: { snapshotsUpserted: count },
  });
});
