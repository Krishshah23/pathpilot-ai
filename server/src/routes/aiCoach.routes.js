import { Router } from 'express';
import {
  explainScore,
  chat,
  generateInterviewQuestion,
  evaluateInterviewAnswer,
  saveInterviewSession,
  getInterviewSessions,
} from '../controllers/aiCoach.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect); // all AI coach routes require login

router.post('/explain', explainScore);
router.post('/chat', chat);

// Interview endpoints
router.post('/interview/question', generateInterviewQuestion);
router.post('/interview/evaluate', evaluateInterviewAnswer);
router.post('/interview/save-session', saveInterviewSession);
router.get('/interview/sessions', getInterviewSessions);

export default router;
