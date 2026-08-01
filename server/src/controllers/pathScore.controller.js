/**
 * controllers/pathScore.controller.js — Path Score & Readiness Controller
 *
 * ARCHITECTURAL ROLE:
 * Calculates the canonical Path Score, pulls legacy ML model predictions, and blends live
 * market demand benchmarks:
 * 1. Computes weighted 4-factor Path Score (`buildPathScore`).
 * 2. Optionally fetches legacy CatBoost/XGBoost predictions from Django (`aiService.predict`).
 * 3. Enforces score preservation: ML level summaries are attached without altering the canonical score.
 * 4. Merges live market salary range (`getMarketSalaryForRole`) and skill match benchmarks (`getMarketDataForRole`).
 */

import { Resume } from '../models/Resume.js';
import { aiService } from '../services/ai.service.js';
import { buildPathScore, collectStudentSkills, isPathScoreCacheStale, recomputePathScoreCache } from '../services/pathScore.service.js';
import { getPeerBenchmark } from '../services/peerBenchmark.service.js';
import { getMarketSalaryForRole, getMarketDataForRole } from '../services/jobMarket.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

/**
 * GET /api/path-score
 * Computes canonical Path Score breakdown, fetches ML predictions, and returns blended market benchmarks.
 */
export const getPathScore = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  const pathScore = buildPathScore(req.user, resume);
  const currentSkills = collectStudentSkills(req.user, resume);

  // Opportunistically warm the Path Score cache on dashboard load — this is what
  // keeps Peer Benchmarking's aggregation and Smart Notifications' delta detection
  // accurate without a separate backfill job for existing users.
  if (isPathScoreCacheStale(req.user)) {
    recomputePathScoreCache(req.user, resume).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Failed to opportunistically refresh Path Score cache:', err);
    });
  }

  try {
    const payload = {
      skills: resume?.skills || [],
      education: resume?.education || [],
      projects: resume?.projects || [],
      experience: resume?.experience || [],
      certifications: resume?.certifications || [],
      contact: resume?.contact || {},
      healthScore: resume?.healthScore || 0,
      wordCount: resume?.wordCount || 0,
      rawText: '',
      profile: {
        college: req.user.profile?.college || '',
        branch: req.user.profile?.branch || '',
        semester: req.user.profile?.semester || null,
        dreamRole: req.user.profile?.dreamRole || '',
        skills: req.user.profile?.skills || [],
        resumeUrl: req.user.profile?.resumeUrl || '',
      },
      currentSkills,
      targetRole: req.user.profile?.dreamRole || '',
    };

    // Legacy ML pipeline prediction (demonstration feature)
    const mlResponse = await aiService.predict(payload);
    if (mlResponse?.data) {
      const mlData = mlResponse.data;
      pathScore.predictions = mlData;

      if (mlData.careerReadiness?.level) {
        pathScore.readiness = {
          ...pathScore.readiness,
          mlLevel: mlData.careerReadiness.level,
          mlSummary: mlData.careerReadiness.summary,
        };
      }
      if (mlData.peerBenchmark && !mlData.peerBenchmark.isFallback) {
        pathScore.peerBenchmark = mlData.peerBenchmark;
      }
      if (mlData.recommendations) {
        pathScore.recommendations = mlData.recommendations;
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log('[PathScore] ML prediction pipeline bypassed (models not trained or cold-start):', err.message);
  }

  // Defensive fallback for SHAP explanation UI rendering
  pathScore.predictions = pathScore.predictions || {};
  pathScore.predictions.explanations = pathScore.predictions.explanations || {
    topPositive: [],
    topNegative: [],
    shapRaw: [],
  };

  // Live market salary and benchmark blending
  let marketSalary = { available: false };
  let blendedBenchmark = { available: false };
  try {
    const dreamRole = req.user.profile?.dreamRole;
    if (dreamRole) {
      marketSalary = await getMarketSalaryForRole(dreamRole);

      const marketData = await getMarketDataForRole(dreamRole);
      if (marketData && marketData.available && marketData.skills?.length > 0) {
        const topMarketSkills = marketData.skills.slice(0, 10);
        const studentSkillsLower = new Set(currentSkills.map((s) => String(s).toLowerCase()));

        const skillMatches = topMarketSkills.map((s) => ({
          skill: s.skill,
          demand: s.frequency,
          matched: studentSkillsLower.has(s.skill.toLowerCase()),
        }));

        const matchedCount = skillMatches.filter((s) => s.matched).length;
        const matchRate = Math.round((matchedCount / Math.max(1, topMarketSkills.length)) * 100);
        const avgMarketDemand = Math.round(
          topMarketSkills.reduce((sum, s) => sum + s.frequency, 0) / Math.max(1, topMarketSkills.length)
        );

        blendedBenchmark = {
          available: true,
          matchRate,
          avgMarketDemand,
          skills: skillMatches,
          sampleSize: marketData.sampleSize,
          lastUpdated: marketData.lastUpdated,
        };
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error fetching market salary/data:', err);
  }

  return sendSuccess(res, { data: { pathScore, marketSalary, blendedBenchmark } });
});

/**
 * GET /api/path-score/peer-benchmark
 * Returns anonymous peer comparison stats for the candidate's dream role
 * (percentile, score histogram, per-factor comparison). See peerBenchmark.service.js.
 */
export const getPeerBenchmarkStats = asyncHandler(async (req, res) => {
  const benchmark = await getPeerBenchmark(req.user);
  return sendSuccess(res, { data: { benchmark } });
});
