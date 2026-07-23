/**
 * routes/report.routes.js — Comprehensive Career Report Router
 *
 * ENDPOINTS:
 * - GET /api/report → Compiles full aggregated career report for printing/sharing
 */

import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import * as ctrl from '../controllers/report.controller.js';

const router = Router();

router.use(protect);

router.get('/', ctrl.generate);

export default router;
