import { Router } from 'express';
import {
  explainScore,
  chat,
  generateInterviewQuestion,
  evaluateInterviewAnswer,
} from '../controllers/aiCoach.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect); // all AI coach routes require login

router.post('/explain', explainScore);
router.post('/chat', chat);

// Interview endpoints (Phase 4)
router.post('/interview/question', generateInterviewQuestion);
router.post('/interview/evaluate', evaluateInterviewAnswer);

export default router;
