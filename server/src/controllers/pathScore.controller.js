import { Resume } from '../models/Resume.js';
import { aiService } from '../services/ai.service.js';
import { buildPathScore } from '../services/pathScore.service.js';
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

  try {
    const readiness = await aiService.predictReadiness({
      profile: profilePayload(req.user),
      resume: resumePayload(resume),
      pathScore: pathScore.score,
    });
    if (readiness?.data) {
      pathScore.readiness = readiness.data;
    }
  } catch {
    // Keep Path Score available even if the AI service is not running locally.
  }

  return sendSuccess(res, { data: { pathScore } });
});

