/**
 * routes/liveJobs.routes.js — Live Job Openings Router (TheirStack API)
 *
 * ENDPOINTS:
 * - GET    /api/live-jobs       → Get active job listings for candidate role & country
 * - DELETE /api/live-jobs/cache → Admin-only: Invalidate persistent L1 & L2 cache
 */

import { Router } from 'express';
import { getJobOpenings, invalidateCache } from '../controllers/liveJobs.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/', getJobOpenings);

// Admin-only cache purge endpoint
router.delete('/cache', authorize('admin'), invalidateCache);

export default router;
