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
  getInterviewSessionDetail,
  getInterviewAnalytics,
} from '../controllers/aiCoach.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { aiActionLimiter, interviewLimiter } from '../middleware/aiRateLimit.middleware.js';

const router = Router();

router.use(protect);

router.post('/explain', aiActionLimiter, explainScore);
router.post('/chat', aiActionLimiter, chat);

// AI Mock Interview endpoints
// Only question/evaluate call Gemini — rate-limited. save-session/sessions/analytics
// are plain DB reads/writes with no external-API cost, so they're left unlimited.
router.post('/interview/question', interviewLimiter, generateInterviewQuestion);
router.post('/interview/evaluate', interviewLimiter, evaluateInterviewAnswer);
router.post('/interview/save-session', saveInterviewSession);
router.get('/interview/analytics', getInterviewAnalytics);
router.get('/interview/sessions', getInterviewSessions);
router.get('/interview/sessions/:id', getInterviewSessionDetail);

export default router;
