/**
 * routes/insights.routes.js — Career Insights Router
 *
 * ENDPOINTS:
 * - GET /api/insights → Aggregated candidate metrics (Path score, skill distribution, gap counts)
 */

import { Router } from 'express';
import { getInsights } from '../controllers/insights.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/', getInsights);

export default router;
