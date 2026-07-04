import { Router } from 'express';
import { getPathScore } from '../controllers/pathScore.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/', getPathScore);

export default router;

