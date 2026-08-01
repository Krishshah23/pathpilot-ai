/**
 * controllers/report.controller.js — Career Report Aggregator Controller
 *
 * ARCHITECTURAL ROLE:
 * Aggregates candidate data from every module into a single unified report payload:
 * - Student profile metadata
 * - Path Score breakdown & factors
 * - Latest Resume analysis & Gemini AI insights
 * - Growth Roadmap summary
 * - Skill category distribution
 * - Opportunity application stage counts
 *
 * The compiled report payload is rendered by the frontend as a printable / PDF-exportable career report.
 */

import { User } from '../models/User.js';
import { Resume } from '../models/Resume.js';
import { GrowthPlan } from '../models/GrowthPlan.js';
import { Opportunity } from '../models/Opportunity.js';
import { buildPathScore, collectStudentSkills } from '../services/pathScore.service.js';
import { aiService } from '../services/ai.service.js';
import { skillDistribution } from '../services/insights.service.js';
import { withProgress } from '../services/growth.service.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/report
 * Compiles and returns full candidate career report object.
 */
export const generate = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Execute database queries in parallel for optimal response speed
  const [user, resumes, growthPlan, opportunities] = await Promise.all([
    User.findById(userId),
    Resume.find({ user: userId }).sort({ createdAt: -1 }),
    GrowthPlan.findOne({ user: userId }),
    Opportunity.find({ user: userId }).sort({ updatedAt: -1 }).lean(),
  ]);

  const latestResume = resumes.length ? resumes[0] : null;
  const pathScore = buildPathScore(user, latestResume);
  const skills = collectStudentSkills(user, latestResume);
  const distribution = skillDistribution(skills);

  const planData = withProgress(growthPlan);

  const oppStats = {};
  for (const o of opportunities) {
    oppStats[o.stage] = (oppStats[o.stage] || 0) + 1;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    student: {
      name: user.name,
      email: user.email,
      college: user.profile?.college || '',
      branch: user.profile?.branch || '',
      semester: user.profile?.semester || null,
      dreamRole: user.profile?.dreamRole || '',
      skills,
    },
    pathScore: {
      score: pathScore.score,
      label: pathScore.label,
      summary: pathScore.summary,
      readiness: pathScore.readiness,
      factors: pathScore.factors,
      profileCompletion: pathScore.profileCompletion,
      predictions: null,
    },
    resume: latestResume
      ? {
          healthScore: latestResume.healthScore,
          skills: latestResume.skills,
          education: latestResume.education,
          projects: latestResume.projects,
          experience: latestResume.experience,
          certifications: latestResume.certifications,
          healthBreakdown: latestResume.healthBreakdown,
          suggestions: latestResume.suggestions,
          versions: resumes.length,
          roleFitScore: latestResume.roleFitScore,
          keyGaps: latestResume.keyGaps,
          strengthAreas: latestResume.strengthAreas,
          atsKeywordsMissing: latestResume.atsKeywordsMissing,
          aiRecommendations: latestResume.aiRecommendations,
          nextStepPriority: latestResume.nextStepPriority,
        }
      : null,
    growthPlan: planData
      ? {
          targetRole: planData.targetRole,
          summary: planData.summary,
          totalWeeks: planData.totalWeeks,
          totalTasks: planData.progress.totalTasks,
          completedTasks: planData.progress.completedTasks,
          totalHours: planData.totalHours,
          percent: planData.progress.percent,
          strengths: planData.strengths,
        }
      : null,
    skillDistribution: distribution,
    opportunities: {
      total: opportunities.length,
      byStage: oppStats,
      recent: opportunities.slice(0, 5).map((o) => ({
        company: o.company,
        role: o.role,
        stage: o.stage,
      })),
    },
  };

  // Legacy ML prediction demo attachment
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
          college: user.profile?.college || '',
          branch: user.profile?.branch || '',
          semester: user.profile?.semester || null,
          dreamRole: user.profile?.dreamRole || '',
          skills: user.profile?.skills || [],
          resumeUrl: user.profile?.resumeUrl || '',
        },
        currentSkills: skills,
        targetRole: user.profile?.dreamRole || '',
      };

      const mlResponse = await aiService.predict(payload);
      if (mlResponse?.data) {
        report.pathScore.predictions = mlResponse.data;
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log('[Report] ML prediction pipeline bypassed (models not trained or cold-start):', err.message);
  }

  sendSuccess(res, { data: { report } });
});
