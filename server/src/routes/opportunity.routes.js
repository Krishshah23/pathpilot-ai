import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import * as ctrl from '../controllers/opportunity.controller.js';

const router = Router();

// All opportunity routes require authentication.
router.use(protect);

router.get('/stats', ctrl.stats);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
