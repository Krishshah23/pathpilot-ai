import { Router } from 'express';
import authRoutes from './auth.routes.js';
import onboardingRoutes from './onboarding.routes.js';
import profileRoutes from './profile.routes.js';
import resumeRoutes from './resume.routes.js';
import pathScoreRoutes from './pathScore.routes.js';
import gapRoutes from './gap.routes.js';
import { aiService } from '../services/ai.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, service: 'pathpilot-server', status: 'ok' });
});

// Verifies the Node → Django link (full three-tier connectivity check).
router.get(
  '/health/ai',
  asyncHandler(async (_req, res) => {
    const ai = await aiService.health();
    res.json({ success: true, node: 'ok', ai });
  })
);

router.use('/auth', authRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/profile', profileRoutes);
router.use('/resume', resumeRoutes);
router.use('/path-score', pathScoreRoutes);
router.use('/gap', gapRoutes);

// Future modules mount here: /growth, /insights, /opportunities, /report, /admin

export default router;
