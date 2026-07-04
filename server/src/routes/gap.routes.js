import { Router } from 'express';
import { analyzeGap } from '../controllers/gap.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { gapAnalysisSchema } from '../validators/path.validators.js';

const router = Router();

router.use(protect);

router.post('/analyze', validate(gapAnalysisSchema), analyzeGap);

export default router;

