import { Router } from 'express';
import { explainScore, chat } from '../controllers/aiCoach.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect); // all AI coach routes require login

router.post('/explain', explainScore);
router.post('/chat', chat);

export default router;
