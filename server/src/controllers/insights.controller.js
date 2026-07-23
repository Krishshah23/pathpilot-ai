/**
 * controllers/insights.controller.js — Career Insights & Analytics Controller
 *
 * ARCHITECTURAL ROLE:
 * Compiles an integrated dashboard analytics payload combining:
 * - Current Path Score & 4 readiness factor scores.
 * - Resume health score progression over time (`resumeTrend`).
 * - Active Growth Path progress metrics.
 * - Categorized skill distribution (`skillDistribution`).
 * - Live market salary projections for the candidate's target role.
 *
 * CRITICAL FIX & SCORE INTEGRITY:
 * Preserves the factor-based `pathScore.displayScore` as the canonical Path Score.
 * Legacy ML predictions (from Django `aiService.predict`) are attached under `pathScore.predictions`
 * without overriding the composite factor score, maintaining visual consistency on dashboard cards.
 */

import { Resume } from '../models/Resume.js';
import { GrowthPlan } from '../models/GrowthPlan.js';
import { buildPathScore, collectStudentSkills } from '../services/pathScore.service.js';
import { aiService } from '../services/ai.service.js';
import { withProgress } from '../services/growth.service.js';
import { skillDistribution } from '../services/insights.service.js';
import { getMarketSalaryForRole } from '../services/jobMarket.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

/**
 * GET /api/insights
 * Returns complete aggregated career analytics for the authenticated student.
 */
export const getInsights = asyncHandler(async (req, res) => {
  const [resumes, plan] = await Promise.all([
    Resume.find({ user: req.user._id }).sort({ createdAt: 1 }).select('healthScore createdAt originalName'),
    GrowthPlan.findOne({ user: req.user._id }),
  ]);

  const latestResumeHeader = resumes.length ? resumes[resumes.length - 1] : null;
  const latestResume = latestResumeHeader ? await Resume.findById(latestResumeHeader._id) : null;
  const pathScore = buildPathScore(req.user, latestResume);
  const skills = collectStudentSkills(req.user, latestResume);

  // Fetch ML predictions for supplementary insights (without overriding canonical pathScore)
  try {
    if (latestResume) {
      const payload = {
        skills: latestResume.skills || [],
        education: latestResume.education || [],
        projects: latestResume.projects || [],
        experience: latestResume.experience || [],
        certifications: latestResume.certifications || [],
        contact: latestResume.contact || {},
        healthScore: latestResume.healthScore || 0,
        wordCount: latestResume.wordCount || 0,
        rawText: '',
        profile: {
          college: req.user.profile?.college || '',
          branch: req.user.profile?.branch || '',
          semester: req.user.profile?.semester || null,
          dreamRole: req.user.profile?.dreamRole || '',
          skills: req.user.profile?.skills || [],
          resumeUrl: req.user.profile?.resumeUrl || '',
        },
        currentSkills: skills,
        targetRole: req.user.profile?.dreamRole || '',
      };

      const mlResponse = await aiService.predict(payload);
      if (mlResponse?.data) {
        pathScore.predictions = mlResponse.data;
        if (mlResponse.data.careerReadiness?.level) {
          pathScore.readiness = {
            ...pathScore.readiness,
            mlLevel: mlResponse.data.careerReadiness.level,
            mlSummary: mlResponse.data.careerReadiness.summary,
          };
        }
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error fetching ML predictions for insights:', err);
  }

  // Chronological resume health trend
  const resumeTrend = resumes.map((r, i) => ({
    index: i + 1,
    date: r.createdAt,
    score: r.healthScore,
    name: r.originalName || `Version ${i + 1}`,
  }));

  // Growth plan progress
  const planWithProgress = withProgress(plan);
  const growth = planWithProgress
    ? {
        hasPlan: true,
        targetRole: planWithProgress.targetRole,
        percent: planWithProgress.progress.percent,
        completedTasks: planWithProgress.progress.completedTasks,
        totalTasks: planWithProgress.progress.totalTasks,
        weeks: planWithProgress.weeks.map((w) => ({
          week: w.week,
          title: w.title,
          percent: w.percent,
        })),
      }
    : { hasPlan: false };

  // Fetch live market salary benchmark
  let marketSalary = { available: false };
  try {
    const dreamRole = req.user.profile?.dreamRole;
    if (dreamRole) {
      marketSalary = await getMarketSalaryForRole(dreamRole);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error fetching market salary for insights:', err);
  }

  return sendSuccess(res, {
    data: {
      pathScore: {
        score: pathScore.displayScore ?? Math.round(pathScore.score || 0),
        label: pathScore.label,
        factors: pathScore.factors.map((f) => ({
          label: f.label,
          score: f.score,
          max: f.max,
          percent: f.percent,
        })),
      },
      readiness: pathScore.readiness,
      resumeTrend,
      growth,
      skillDistribution: skillDistribution(skills),
      totals: {
        skills: skills.length,
        projects: pathScore.projectsCount,
        resumeVersions: resumes.length,
        latestResumeHealth: latestResume?.healthScore ?? null,
      },
      marketSalary,
    },
  });
});
