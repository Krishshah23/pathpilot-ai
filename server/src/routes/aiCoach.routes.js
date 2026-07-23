/**
 * routes/aiCoach.routes.js — AI Coach & Interview Prep Router
 *
 * ENDPOINTS:
 * - POST /api/ai-coach/explain                → Pre-generate Gemini Path Score explanation narrative
 * - POST /api/ai-coach/chat                   → Interactive career coaching chat (context-injected)
 * - POST /api/ai-coach/interview/question     → Generate targeted interview question for a gap
 * - POST /api/ai-coach/interview/evaluate     → Multi-dimensional rubric evaluation of candidate answer
 * - POST /api/ai-coach/interview/save-session → Persist completed mock interview session
 * - GET  /api/ai-coach/interview/sessions     → Fetch historical mock interview sessions
 */

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

router.use(protect);

router.post('/explain', explainScore);
router.post('/chat', chat);

// AI Mock Interview endpoints
router.post('/interview/question', generateInterviewQuestion);
router.post('/interview/evaluate', evaluateInterviewAnswer);
router.post('/interview/save-session', saveInterviewSession);
router.get('/interview/sessions', getInterviewSessions);

export default router;
