/**
 * routes/jobMarket.routes.js — Market Intelligence Router
 *
 * ENDPOINTS:
 * - GET  /api/job-market/:role        → Get skill frequency demand percentages for target role
 * - GET  /api/job-market/:role/salary → Get aggregate market salary range (in INR LPA)
 * - POST /api/job-market/refresh     → Admin-only: Force immediate Adzuna data refresh
 */

import { Router } from 'express';
import { getMarketData, getMarketSalary, triggerRefresh } from '../controllers/jobMarket.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/:role', getMarketData);
router.get('/:role/salary', getMarketSalary);

// Admin-only data refresh endpoint
router.post('/refresh', authorize('admin'), triggerRefresh);

export default router;
