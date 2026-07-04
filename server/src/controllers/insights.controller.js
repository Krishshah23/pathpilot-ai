import { Resume } from '../models/Resume.js';
import { GrowthPlan } from '../models/GrowthPlan.js';
import { buildPathScore, collectStudentSkills } from '../services/pathScore.service.js';
import { aiService } from '../services/ai.service.js';
import { withProgress } from '../services/growth.service.js';
import { skillDistribution } from '../services/insights.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

/**
 * Aggregates everything the student has produced into one analytics payload:
 *   - Path Score + factor breakdown
 *   - resume health trend over time (from resume history)
 *   - Growth Path progress (from the active plan)
 *   - skill distribution by category
 * All data is derived from existing modules — no new persistence needed.
 */
// GET /api/insights
export const getInsights = asyncHandler(async (req, res) => {
  const [resumes, plan] = await Promise.all([
    Resume.find({ user: req.user._id }).sort({ createdAt: 1 }).select('healthScore createdAt originalName'),
    GrowthPlan.findOne({ user: req.user._id }),
  ]);

  const latestResumeHeader = resumes.length ? resumes[resumes.length - 1] : null;
  const latestResume = latestResumeHeader ? await Resume.findById(latestResumeHeader._id) : null;
  const pathScore = buildPathScore(req.user, latestResume);
  const skills = collectStudentSkills(req.user, latestResume);

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
        pathScore.score = mlResponse.data.resumeScore;
        pathScore.readiness = mlResponse.data.careerReadiness;
      }
    }
  } catch (err) {
    console.error('Error fetching ML predictions for insights:', err);
  }

  // Resume health trend (chronological)
  const resumeTrend = resumes.map((r, i) => ({
    index: i + 1,
    date: r.createdAt,
    score: r.healthScore,
    name: r.originalName || `Version ${i + 1}`,
  }));

  // Growth progress summary
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

  return sendSuccess(res, {
    data: {
      pathScore: {
        score: pathScore.score,
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
    },
  });
});
