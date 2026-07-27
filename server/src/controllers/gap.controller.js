/**
 * controllers/gap.controller.js — Skill Gap Analysis Controller
 *
 * ARCHITECTURAL ROLE:
 * Orchestrates skill gap analysis by combining AI recommendations with live market demand:
 * 1. Collects candidate skills across user profile and latest resume.
 * 2. Fetches skill gap analysis from Django ML service (`aiService.skillGap`).
 * 3. Fetches live market demand from Adzuna snapshot service (`getMarketDataForRole`).
 * 4. Merges market frequency percentages into missing and matched skills.
 * 5. Sorts missing skills by core priority and market frequency.
 */

import { Resume } from '../models/Resume.js';
import { aiService } from '../services/ai.service.js';
import { collectStudentSkills } from '../services/pathScore.service.js';
import { getMarketDataForRole } from '../services/jobMarket.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { notifyOnce } from '../services/notification.service.js';

/**
 * POST /api/gap/analyze
 * Performs role skill gap analysis enriched with real-time job market frequency metrics.
 */
export const analyzeGap = asyncHandler(async (req, res) => {
  const targetRole = req.body.targetRole || req.user.profile?.dreamRole;
  if (!targetRole) {
    throw ApiError.badRequest('Choose a target role to analyze');
  }

  const resume = await Resume.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  const currentSkills = collectStudentSkills(req.user, resume);

  // Parallel execution: fetch AI gap analysis and live market demand simultaneously
  const [aiResponse, marketData] = await Promise.all([
    aiService.skillGap({ targetRole, currentSkills }),
    getMarketDataForRole(targetRole),
  ]);

  const gap = aiResponse?.data;

  if (!gap) {
    throw new ApiError(
      502,
      aiResponse?.implemented === false
        ? 'The AI service is running outdated code. Please restart the Django service.'
        : 'AI service returned no gap analysis'
    );
  }

  // Enrich missing skills with live market frequency data
  if (marketData.available && marketData.skills.length) {
    const marketSkillMap = new Map(
      marketData.skills.map((s) => [s.skill.toLowerCase(), s])
    );

    gap.missingSkills = gap.missingSkills.map((item) => {
      const market = marketSkillMap.get(item.skill.toLowerCase());
      return {
        ...item,
        marketFrequency: market?.frequency ?? null,
        demand: market?.frequency ?? null, // UI reads `demand`
        marketBacked: Boolean(market),
      };
    });

    // Sort missing skills: core priority first, then descending market frequency
    gap.missingSkills.sort((a, b) => {
      const prioOrder = { core: 0, recommended: 1, supporting: 2 };
      const pa = prioOrder[a.priority] ?? 3;
      const pb = prioOrder[b.priority] ?? 3;
      if (pa !== pb) return pa - pb;
      const fa = a.marketFrequency ?? -1;
      const fb = b.marketFrequency ?? -1;
      return fb - fa;
    });

    // Enrich matched skills with market demand
    gap.matchedSkills = gap.matchedSkills.map((item) => {
      const market = marketSkillMap.get(item.skill.toLowerCase());
      return {
        ...item,
        marketFrequency: market?.frequency ?? null,
        demand: market?.frequency ?? null,
        marketBacked: Boolean(market),
      };
    });
  }

  ensureGapRecommendations(gap);

  // Milestone: first gap analysis ever run. notifyOnce with a multi-year lookback
  // is the "has this ever fired before" guard — this endpoint has no persisted
  // gap-analysis history to count against, unlike resume uploads.
  notifyOnce(req.user._id, {
    title: 'Milestone: first gap analysis complete',
    message: `You've mapped your skill gaps for ${targetRole} — check your roadmap to start closing them.`,
    type: 'success',
    actionLink: '/execution-engine',
    lookbackDays: 3650,
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to send gap analysis milestone notification:', err);
  });

  return sendSuccess(res, {
    data: {
      gap,
      sources: {
        profileSkills: req.user.profile?.skills?.length || 0,
        resumeSkills: resume?.skills?.length || 0,
        resumeUsed: Boolean(resume),
        recommendationsFrom: gap.recommendationSource,
      },
      marketData: {
        available: marketData.available,
        lastUpdated: marketData.lastUpdated,
        sampleSize: marketData.sampleSize,
        skillsTracked: marketData.skills.length,
      },
    },
  });
});

/**
 * Ensures gap object contains actionable recommendations fallback.
 */
export function ensureGapRecommendations(gap) {
  if (!gap) return;
  if (!gap.recommendations || !Array.isArray(gap.recommendations) || gap.recommendations.length === 0) {
    gap.recommendations =
      gap.missingSkills?.slice(0, 6).map((s) => {
        const hours = s.estimatedHours ?? null;
        return hours ? `Learn ${s.skill} — ~${hours}h` : `Learn ${s.skill}`;
      }) || [];
    gap.recommendationSource = 'fallback';
  } else {
    gap.recommendationSource = 'ai';
  }
  return gap;
}
