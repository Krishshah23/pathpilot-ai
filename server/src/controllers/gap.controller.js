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
import { geminiAnalyzeSkillGap } from '../services/gemini.service.js';
import { collectStudentSkills } from '../services/pathScore.service.js';
import { getMarketDataForRole } from '../services/jobMarket.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { notifyOnce } from '../services/notification.service.js';

// ── Local skill gap fallback ─────────────────────────────────────────────────
const ROLE_REQUIRED_SKILLS = {
  'Full Stack Developer': [
    { skill: 'JavaScript', priority: 'core', estimatedHours: 12 },
    { skill: 'React', priority: 'core', estimatedHours: 14 },
    { skill: 'Node.js', priority: 'core', estimatedHours: 12 },
    { skill: 'MongoDB', priority: 'recommended', estimatedHours: 8 },
    { skill: 'Docker', priority: 'supporting', estimatedHours: 8 },
    { skill: 'REST APIs', priority: 'core', estimatedHours: 8 },
    { skill: 'Git', priority: 'recommended', estimatedHours: 4 },
  ],
  'Backend Developer': [
    { skill: 'Node.js', priority: 'core', estimatedHours: 12 },
    { skill: 'SQL', priority: 'core', estimatedHours: 10 },
    { skill: 'REST APIs', priority: 'core', estimatedHours: 8 },
    { skill: 'Docker', priority: 'recommended', estimatedHours: 8 },
    { skill: 'System Design', priority: 'recommended', estimatedHours: 10 },
  ],
  'Frontend Developer': [
    { skill: 'React', priority: 'core', estimatedHours: 14 },
    { skill: 'TypeScript', priority: 'core', estimatedHours: 8 },
    { skill: 'CSS', priority: 'core', estimatedHours: 6 },
    { skill: 'State Management', priority: 'recommended', estimatedHours: 6 },
  ],
  'Data Scientist': [
    { skill: 'Python', priority: 'core', estimatedHours: 10 },
    { skill: 'Machine Learning', priority: 'core', estimatedHours: 14 },
    { skill: 'Pandas', priority: 'core', estimatedHours: 8 },
    { skill: 'SQL', priority: 'recommended', estimatedHours: 8 },
    { skill: 'Statistics', priority: 'core', estimatedHours: 10 },
  ],
  'ML Engineer': [
    { skill: 'Python', priority: 'core', estimatedHours: 10 },
    { skill: 'PyTorch', priority: 'core', estimatedHours: 14 },
    { skill: 'Docker', priority: 'recommended', estimatedHours: 8 },
    { skill: 'FastAPI', priority: 'core', estimatedHours: 6 },
    { skill: 'Cloud Deployment', priority: 'supporting', estimatedHours: 8 },
  ],
  'DevOps Engineer': [
    { skill: 'Linux', priority: 'core', estimatedHours: 8 },
    { skill: 'Docker', priority: 'core', estimatedHours: 10 },
    { skill: 'Kubernetes', priority: 'core', estimatedHours: 12 },
    { skill: 'CI/CD', priority: 'core', estimatedHours: 10 },
    { skill: 'AWS', priority: 'recommended', estimatedHours: 12 },
  ],
};

function localSkillGapFallback(targetRole, currentSkills = []) {
  const roleKey = Object.keys(ROLE_REQUIRED_SKILLS).find(
    (r) => r.toLowerCase() === (targetRole || '').toLowerCase() ||
      (targetRole || '').toLowerCase().includes(r.split(' ')[0].toLowerCase())
  );
  const required = ROLE_REQUIRED_SKILLS[roleKey] || ROLE_REQUIRED_SKILLS['Full Stack Developer'];
  const currentLower = currentSkills.map((s) => s.toLowerCase());

  const matchedSkills = required.filter((r) =>
    currentLower.some((c) => c.includes(r.skill.toLowerCase().split(' ')[0]))
  );
  const missingSkills = required.filter((r) =>
    !currentLower.some((c) => c.includes(r.skill.toLowerCase().split(' ')[0]))
  );

  const score = required.length > 0 ? Math.round((matchedSkills.length / required.length) * 100) : 0;

  return {
    targetRole,
    matchedSkills,
    missingSkills,
    score,
    recommendations: missingSkills.slice(0, 4).map((s) => `Learn ${s.skill} — ~${s.estimatedHours}h`),
  };
}


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

  // Fetch market data in parallel; AI gap analysis tries Django first then falls back to Gemini
  const [aiResult, marketData] = await Promise.all([
    (async () => {
      try {
        const res = await aiService.skillGap({ targetRole, currentSkills });
        return res?.data || null;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[Gap] Django skill gap service unavailable, trying Gemini fallback:', err.message);
        return null;
      }
    })(),
    getMarketDataForRole(targetRole),
  ]);

  let gap = aiResult;

  if (!gap) {
    // eslint-disable-next-line no-console
    console.log('[Gap] Using Gemini fallback for skill gap analysis...');
    gap = await geminiAnalyzeSkillGap({ targetRole, currentSkills });
  }

  // Final local fallback — zero external API dependency, always succeeds
  if (!gap) {
    // eslint-disable-next-line no-console
    console.log('[Gap] Both AI services unavailable. Using local role-based skill gap fallback...');
    gap = localSkillGapFallback(targetRole, currentSkills);
  }

  if (!gap) {
    throw new ApiError(502, 'Unable to analyze skill gap — AI service temporarily unavailable. Please try again in a moment.');
  }

  // Enrich missing skills with live market frequency data
  // Guard arrays in case Gemini fallback returned partial data
  gap.missingSkills = Array.isArray(gap.missingSkills) ? gap.missingSkills : [];
  gap.matchedSkills = Array.isArray(gap.matchedSkills) ? gap.matchedSkills : [];

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
