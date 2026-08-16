/**
 * routes/resumeBuilder.routes.js — Resume Builder Router
 *
 * ENDPOINTS:
 * - GET  /api/resume-builder                    → Fetch the candidate's builder doc (or exists:false)
 * - POST /api/resume-builder/init                → Create/reset from scratch | import | migrate
 * - PATCH /api/resume-builder                     → Update any section, recomputes ATS score
 * - POST /api/resume-builder/ai/rewrite-bullet    → AI rewrite one bullet
 * - POST /api/resume-builder/ai/generate-summary  → AI-generate + save professional summary
 * - POST /api/resume-builder/ai/optimize          → Full-resume AI scan (suggestions, not auto-applied)
 * - POST /api/resume-builder/ai/match-jd          → Compare draft against a pasted job description
 * - POST /api/resume-builder/ai/insert-keywords   → Weave missing keywords into the summary
 * - GET  /api/resume-builder/export/pdf|docx|text → Download in the selected format
 */

import { Router } from 'express';
import {
  getResumeBuilder,
  initResumeBuilder,
  updateResumeBuilder,
  rewriteBullet,
  generateSummary,
  optimizeResume,
  matchJobDescription,
  insertKeywords,
  exportPdf,
  exportDocx,
  exportText,
} from '../controllers/resumeBuilder.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { aiActionLimiter } from '../middleware/aiRateLimit.middleware.js';

const router = Router();

router.use(protect);

router.get('/', getResumeBuilder);
router.post('/init', upload('resume', 'file'), initResumeBuilder);
router.patch('/', updateResumeBuilder);

router.post('/ai/rewrite-bullet', aiActionLimiter, rewriteBullet);
router.post('/ai/generate-summary', aiActionLimiter, generateSummary);
router.post('/ai/optimize', aiActionLimiter, optimizeResume);
router.post('/ai/match-jd', aiActionLimiter, matchJobDescription);
router.post('/ai/insert-keywords', aiActionLimiter, insertKeywords);

router.get('/export/pdf', exportPdf);
router.get('/export/docx', exportDocx);
router.get('/export/text', exportText);

export default router;
