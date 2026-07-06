import { Resume } from '../models/Resume.js';
import { aiService } from '../services/ai.service.js';
import { buildPathScore, collectStudentSkills } from '../services/pathScore.service.js';
import { getMarketSalaryForRole } from '../services/jobMarket.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

function profilePayload(user) {
  const profile = user.profile || {};
  return {
    college: profile.college,
    branch: profile.branch,
    semester: profile.semester,
    dreamRole: profile.dreamRole,
    skills: profile.skills || [],
    resumeUrl: profile.resumeUrl,
  };
}

function resumePayload(resume) {
  if (!resume) return null;
  return {
    fileUrl: resume.fileUrl,
    healthScore: resume.healthScore,
    skills: resume.skills || [],
    projects: resume.projects || [],
    education: resume.education || [],
    experience: resume.experience || [],
    certifications: resume.certifications || [],
  };
}

// GET /api/path-score
export const getPathScore = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  const pathScore = buildPathScore(req.user, resume);
  const currentSkills = collectStudentSkills(req.user, resume);

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

    const mlResponse = await aiService.predict(payload);
    if (mlResponse?.data) {
      const mlData = mlResponse.data;
      pathScore.score = mlData.resumeScore;
      pathScore.readiness = mlData.careerReadiness;
      pathScore.predictions = mlData;
      // Map SHAP explanations to recommendations or show directly
      if (mlData.recommendations) {
        pathScore.recommendations = mlData.recommendations;
      }
    }
  } catch (err) {
    console.error('Error fetching ML predictions:', err);
    // Keep fallback pathScore available if Django AI service is down
  }

  // Fetch live market salary range for the user's dream role.
  let marketSalary = { available: false };
  try {
    const dreamRole = req.user.profile?.dreamRole;
    if (dreamRole) {
      marketSalary = await getMarketSalaryForRole(dreamRole);
    }
  } catch (err) {
    console.error('Error fetching market salary:', err);
  }

  return sendSuccess(res, { data: { pathScore, marketSalary } });
});

