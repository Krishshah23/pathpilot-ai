/**
 * routes/opportunity.routes.js — Job Application Kanban Tracker Router
 *
 * ENDPOINTS:
 * - GET    /api/opportunities/stats → Pipeline stage counts summary
 * - GET    /api/opportunities       → List candidate application cards
 * - POST   /api/opportunities       → Track new job opportunity
 * - PATCH  /api/opportunities/:id   → Update application stage, notes, or details
 * - DELETE /api/opportunities/:id   → Remove application card
 */

import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import * as ctrl from '../controllers/opportunity.controller.js';

const router = Router();

router.use(protect);

router.get('/stats', ctrl.stats);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
