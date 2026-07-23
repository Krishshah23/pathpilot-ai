/**
 * routes/pathScore.routes.js — Path Score Router
 *
 * ENDPOINTS:
 * - GET /api/path-score → Weighted Path Score breakdown, ML readiness level, salary range & SHAP drivers
 */

import { Router } from 'express';
import { getPathScore } from '../controllers/pathScore.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/', getPathScore);

export default router;
