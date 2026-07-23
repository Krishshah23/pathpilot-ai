/**
 * routes/resume.routes.js — Resume Management Router
 *
 * ENDPOINTS:
 * - POST /api/resume/analyze   → Upload file (PDF/DOCX) & run full 9-step analysis pipeline
 * - POST /api/resume/reanalyze → Re-analyze latest resume for a updated target role
 * - GET  /api/resume           → Retrieve candidate's latest resume analysis document
 * - GET  /api/resume/history   → Fetch past resume analysis records (health score history)
 */

import { Router } from 'express';
import {
  analyzeResume,
  getLatestResume,
  getResumeHistory,
  reanalyzeForRole,
} from '../controllers/resume.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = Router();

// Protect all resume routes with JWT authorization
router.use(protect);

router.post('/analyze', upload('resume', 'file'), analyzeResume);
router.post('/reanalyze', reanalyzeForRole);
router.get('/', getLatestResume);
router.get('/history', getResumeHistory);

export default router;
