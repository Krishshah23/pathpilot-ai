import { Router } from 'express';
import { getJobOpenings, invalidateCache } from '../controllers/liveJobs.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// All live-jobs routes require authentication.
router.use(protect);

// GET /api/live-jobs?role=<targetRole>&country=<countryCode>
router.get('/', getJobOpenings);

// DELETE /api/live-jobs/cache?role=<targetRole>&country=<countryCode>
// Admin-only: force-invalidate the persistent cache for a role.
router.delete('/cache', authorize('admin'), invalidateCache);

export default router;
