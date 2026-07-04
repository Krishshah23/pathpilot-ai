import { Resume } from '../models/Resume.js';
import { aiService } from '../services/ai.service.js';
import { collectStudentSkills } from '../services/pathScore.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

/**
 * POST /api/ml/predict
 *
 * Collects resume + profile data, sends it to the Django ML service which
 * runs all 7 trained models, and returns unified predictions:
 *   resumeScore, atsProbability, careerReadiness, recommendedRole,
 *   salaryPrediction, interviewProbability, learningRoadmap,
 *   missingSkills, featureImportance, recommendations, explanations
 */
export const predict = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  const currentSkills = collectStudentSkills(req.user, resume);
  const targetRole = req.body.targetRole || req.user.profile?.dreamRole || '';

  // Build payload for Django ML service
  const payload = {
    // Resume data
    skills: resume?.skills || [],
    education: resume?.education || [],
    projects: resume?.projects || [],
    experience: resume?.experience || [],
    certifications: resume?.certifications || [],
    contact: resume?.contact || {},
    healthScore: resume?.healthScore || 0,
    wordCount: resume?.wordCount || 0,
    rawText: '', // We don't store raw text, features are extracted from parsed data

    // Profile data
    profile: {
      college: req.user.profile?.college || '',
      branch: req.user.profile?.branch || '',
      semester: req.user.profile?.semester || null,
      dreamRole: req.user.profile?.dreamRole || '',
      skills: req.user.profile?.skills || [],
      resumeUrl: req.user.profile?.resumeUrl || '',
    },

    // For ML models
    currentSkills,
    targetRole,
  };

  const aiResponse = await aiService.predict(payload);
  const predictions = aiResponse?.data;

  if (!predictions) {
    return sendSuccess(res, {
      data: {
        predictions: null,
        message: 'ML predictions unavailable. Ensure the AI service is running with trained models.',
      },
    });
  }

  return sendSuccess(res, {
    data: {
      predictions,
      sources: {
        resumeUsed: Boolean(resume),
        profileSkills: req.user.profile?.skills?.length || 0,
        resumeSkills: resume?.skills?.length || 0,
        totalSkills: currentSkills.length,
      },
    },
  });
});
