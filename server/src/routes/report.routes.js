import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import * as ctrl from '../controllers/report.controller.js';

const router = Router();

router.use(protect);

router.get('/', ctrl.generate);

export default router;
