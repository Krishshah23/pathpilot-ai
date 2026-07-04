import { User } from '../models/User.js';
import { Resume } from '../models/Resume.js';
import { GrowthPlan } from '../models/GrowthPlan.js';
import { Opportunity } from '../models/Opportunity.js';
import { pathScoreService } from '../services/pathScore.service.js';
import { insightsService } from '../services/insights.service.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/report
 * Aggregates data from every module into a single report payload that the
 * frontend renders as a printable career report.
 */
export const generate = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Fetch all data in parallel for speed.
  const [
    user,
    resume,
    growthPlan,
    pathScore,
    insights,
    opportunities,
  ] = await Promise.all([
    User.findById(userId),
    Resume.findOne({ user: userId }).sort({ createdAt: -1 }),
    GrowthPlan.findOne({ user: userId }),
    pathScoreService.calculate(userId).catch(() => null),
    insightsService.build(userId).catch(() => null),
    Opportunity.find({ user: userId }).sort({ updatedAt: -1 }).lean(),
  ]);

  // Opportunity stage summary
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
      skills: user.profile?.skills || [],
    },
    pathScore: pathScore || null,
    resume: resume
      ? {
          healthScore: resume.healthScore,
          skills: resume.skills,
          education: resume.education,
          projects: resume.projects,
          experience: resume.experience,
          certifications: resume.certifications,
          healthBreakdown: resume.healthBreakdown,
          suggestions: resume.suggestions,
        }
      : null,
    growthPlan: growthPlan
      ? {
          targetRole: growthPlan.targetRole,
          summary: growthPlan.summary,
          totalWeeks: growthPlan.totalWeeks,
          totalTasks: growthPlan.totalTasks,
          totalHours: growthPlan.totalHours,
          completedTasks: growthPlan.weeks
            .flatMap((w) => w.tasks)
            .filter((t) => t.completed).length,
          strengths: growthPlan.strengths,
        }
      : null,
    insights: insights || null,
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

  sendSuccess(res, { data: { report } });
});
