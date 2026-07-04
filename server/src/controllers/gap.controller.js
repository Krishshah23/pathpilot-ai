import { Resume } from '../models/Resume.js';
import { aiService } from '../services/ai.service.js';
import { collectStudentSkills } from '../services/pathScore.service.js';
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

  const aiResponse = await aiService.skillGap({ targetRole, currentSkills });
  const gap = aiResponse?.data;

  if (!gap) {
    throw new ApiError(
      502,
      aiResponse?.implemented === false
        ? 'The AI service is running outdated code. Please restart the Django service.'
        : 'AI service returned no gap analysis'
    );
  }

  return sendSuccess(res, {
    data: {
      gap,
      sources: {
        profileSkills: req.user.profile?.skills?.length || 0,
        resumeSkills: resume?.skills?.length || 0,
        resumeUsed: Boolean(resume),
      },
    },
  });
});

