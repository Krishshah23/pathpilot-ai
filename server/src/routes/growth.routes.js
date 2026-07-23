/**
 * routes/growth.routes.js — Growth Roadmap Router
 *
 * ENDPOINTS:
 * - GET   /api/growth           → Get active learning plan with progress stats
 * - POST  /api/growth/generate  → Generate new week-by-week roadmap via Django / Gemini
 * - PATCH /api/growth/tasks/:key → Toggle task completion state by stable task key
 */

import { Router } from 'express';
import {
  getGrowthPlan,
  generateGrowthPlan,
  toggleTask,
} from '../controllers/growth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { generateRoadmapSchema, toggleTaskSchema } from '../validators/path.validators.js';

const router = Router();

router.use(protect);

router.get('/', getGrowthPlan);
router.post('/generate', validate(generateRoadmapSchema), generateGrowthPlan);
router.patch('/tasks/:key', validate(toggleTaskSchema), toggleTask);

export default router;
