/**
 * routes/gap.routes.js — Skill Gap Analysis Router
 *
 * ENDPOINTS:
 * - POST /api/gap/analyze → Compare candidate skills against target role requirements via Django ML
 */

import { Router } from 'express';
import { analyzeGap } from '../controllers/gap.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { gapAnalysisSchema } from '../validators/path.validators.js';

const router = Router();

router.use(protect);

router.post('/analyze', validate(gapAnalysisSchema), analyzeGap);

export default router;
