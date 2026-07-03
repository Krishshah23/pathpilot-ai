import { Router } from 'express';
import {
  analyzeResume,
  getLatestResume,
  getResumeHistory,
} from '../controllers/resume.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = Router();

router.use(protect);

router.post('/analyze', upload('resume', 'file'), analyzeResume);
router.get('/', getLatestResume);
router.get('/history', getResumeHistory);

export default router;
