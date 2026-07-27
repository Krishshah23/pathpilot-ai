/**
 * routes/index.js — Master Router Definition
 *
 * ARCHITECTURAL PURPOSE:
 * Mounts all 16 domain sub-routers under `/api/*`.
 * Also exposes:
 *   - `GET /api/health` — Basic service liveness check
 *   - `GET /api/health/ai` — End-to-end multi-tier connectivity check (Node -> Django ML)
 *
 * ROUTE BASE MAP:
 * - /api/auth          → Auth & JWT management
 * - /api/onboarding    → 3-step onboarding wizard
 * - /api/profile       → Student profile & public card
 * - /api/resume        → Resume upload & multi-stage analysis
 * - /api/path-score    → Path Score computation & ML predictions
 * - /api/gap           → Skill gap analysis
 * - /api/growth        → Learning roadmap & task tracking
 * - /api/insights      → Aggregated career progress metrics
 * - /api/opportunities → Job application Kanban pipeline
 * - /api/notifications → In-app user notifications
 * - /api/ai-coach      → Gemini chat, interview coaching & answer evaluation
 * - /api/report        → Printable/shareable career report compile
 * - /api/admin         → Admin dashboard & user management
 * - /api/ml            → Pass-through proxy to Django ML endpoints
 * - /api/job-market    → Market skill frequency & salary benchmarks
 * - /api/live-jobs     → TheirStack live job search cache
 */

import { Router } from 'express';
import authRoutes from './auth.routes.js';
import onboardingRoutes from './onboarding.routes.js';
import profileRoutes from './profile.routes.js';
import resumeRoutes from './resume.routes.js';
import pathScoreRoutes from './pathScore.routes.js';
import gapRoutes from './gap.routes.js';
import growthRoutes from './growth.routes.js';
import insightsRoutes from './insights.routes.js';
import opportunityRoutes from './opportunity.routes.js';
import reportRoutes from './report.routes.js';
import adminRoutes from './admin.routes.js';
import mlRoutes from './ml.routes.js';
import jobMarketRoutes from './jobMarket.routes.js';
import notificationRoutes from './notification.routes.js';
import aiCoachRoutes from './aiCoach.routes.js';
import liveJobsRoutes from './liveJobs.routes.js';
import resumeBuilderRoutes from './resumeBuilder.routes.js';
import { aiService } from '../services/ai.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/** Node API Liveness check */
router.get('/health', (_req, res) => {
  res.json({ success: true, service: 'pathpilot-server', status: 'ok' });
});

/** Full three-tier health check verifying Node -> Django ML microservice communication */
router.get(
  '/health/ai',
  asyncHandler(async (_req, res) => {
    const ai = await aiService.health();
    res.json({ success: true, node: 'ok', ai });
  })
);

// Mount domain routers
router.use('/auth', authRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/profile', profileRoutes);
router.use('/resume', resumeRoutes);
router.use('/path-score', pathScoreRoutes);
router.use('/gap', gapRoutes);
router.use('/growth', growthRoutes);
router.use('/insights', insightsRoutes);
router.use('/opportunities', opportunityRoutes);
router.use('/notifications', notificationRoutes);
router.use('/ai-coach', aiCoachRoutes);
router.use('/report', reportRoutes);
router.use('/admin', adminRoutes);
router.use('/ml', mlRoutes);
router.use('/job-market', jobMarketRoutes);
router.use('/live-jobs', liveJobsRoutes);
router.use('/resume-builder', resumeBuilderRoutes);

export default router;
