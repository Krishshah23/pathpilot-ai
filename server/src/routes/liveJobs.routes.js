/**
 * routes/liveJobs.routes.js — Live Job Openings Router (TheirStack API)
 *
 * ENDPOINTS:
 * - GET    /api/live-jobs       → Get active job listings for candidate role & country
 * - GET    /api/live-jobs/quota → Admin-only: Diagnostic credit consumption & quota details
 * - DELETE /api/live-jobs/cache → Admin-only: Invalidate persistent L1 & L2 cache
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getJobOpenings,
  invalidateCache,
  getCreditStatus,
} from '../controllers/liveJobs.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Throttle live-jobs queries to prevent rapid credit exhaustion (30 requests per 10 min)
const liveJobsLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many live job requests. Please try again shortly.' },
});

router.use(protect);

router.get('/', liveJobsLimiter, getJobOpenings);

// Admin-only quota diagnostics & cache purge endpoints
router.get('/quota', authorize('admin'), getCreditStatus);
router.delete('/cache', authorize('admin'), invalidateCache);

export default router;
