import { Resume } from '../models/Resume.js';
import { aiService } from '../services/ai.service.js';
import { collectStudentSkills } from '../services/pathScore.service.js';
import { getMarketDataForRole } from '../services/jobMarket.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

// POST /api/gap/analyze
export const analyzeGap = asyncHandler(async (req, res) => {
  const targetRole = req.body.targetRole || req.user.profile?.dreamRole;
  if (!targetRole) {
    throw ApiError.badRequest('Choose a target role to analyze');
  }

  const resume = await Resume.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  const currentSkills = collectStudentSkills(req.user, resume);

  // Fetch AI-based gap analysis and live market data in parallel.
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

  // Enrich missing skills with live market frequency when available.
  if (marketData.available && marketData.skills.length) {
    const marketSkillMap = new Map(
      marketData.skills.map((s) => [s.skill.toLowerCase(), s])
    );

    gap.missingSkills = gap.missingSkills.map((item) => {
      const market = marketSkillMap.get(item.skill.toLowerCase());
      return {
        ...item,
        marketFrequency: market?.frequency ?? null,
        marketBacked: Boolean(market),
      };
    });

    // Re-sort missing skills: market-backed core skills first,
    // then by market frequency (descending), then original order.
    gap.missingSkills.sort((a, b) => {
      const prioOrder = { core: 0, recommended: 1, supporting: 2 };
      const pa = prioOrder[a.priority] ?? 3;
      const pb = prioOrder[b.priority] ?? 3;
      if (pa !== pb) return pa - pb;
      // Within same priority, sort by market frequency if available.
      const fa = a.marketFrequency ?? -1;
      const fb = b.marketFrequency ?? -1;
      return fb - fa;
    });

    // Also enrich matched skills.
    gap.matchedSkills = gap.matchedSkills.map((item) => {
      const market = marketSkillMap.get(item.skill.toLowerCase());
      return {
        ...item,
        marketFrequency: market?.frequency ?? null,
        marketBacked: Boolean(market),
      };
    });
  }

  return sendSuccess(res, {
    data: {
      gap,
      sources: {
        profileSkills: req.user.profile?.skills?.length || 0,
        resumeSkills: resume?.skills?.length || 0,
        resumeUsed: Boolean(resume),
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

