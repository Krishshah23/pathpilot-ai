/**
 * routes/growth.routes.js — Growth Roadmap Router
 *
 * ENDPOINTS:
 * - GET    /api/growth            → Get active learning plan with progress stats
 * - POST   /api/growth/generate   → Generate new week-by-week roadmap via Django / Gemini
 * - PATCH  /api/growth/tasks/:key → Toggle task completion state by stable task key
 * - POST   /api/growth/tasks      → Add a manually-created task under "Custom Goals"
 * - DELETE /api/growth/tasks/:key → Remove a manually-created custom task
 */

import { Router } from 'express';
import {
  getGrowthPlan,
  generateGrowthPlan,
  toggleTask,
  addCustomTask,
  removeCustomTask,
} from '../controllers/growth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { generateRoadmapSchema, toggleTaskSchema } from '../validators/path.validators.js';

const router = Router();

router.use(protect);

router.get('/', getGrowthPlan);
router.post('/generate', validate(generateRoadmapSchema), generateGrowthPlan);
router.post('/tasks', addCustomTask);
router.patch('/tasks/:key', validate(toggleTaskSchema), toggleTask);
router.delete('/tasks/:key', removeCustomTask);

export default router;
