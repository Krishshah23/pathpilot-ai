/**
 * controllers/ml.controller.js — Django ML Microservice Proxy Controller
 *
 * ARCHITECTURAL ROLE:
 * Unified pass-through proxy endpoint forwarding candidate features to Django DRF microservice.
 * Runs all 7 trained CatBoost/XGBoost models:
 *   - Resume Quality Model
 *   - ATS Screen Probability Model
 *   - Career Readiness Classification Model
 *   - Role Classifier Model
 *   - Salary Projection Model
 *   - Interview Success Model
 *   - SHAP TreeExplainer Feature Drivers
 */

import { Resume } from '../models/Resume.js';
import { aiService } from '../services/ai.service.js';
import { collectStudentSkills } from '../services/pathScore.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

/**
 * POST /api/ml/predict
 * Collects candidate profile + resume features and proxies prediction request to Django ML service.
 */
export const predict = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  const currentSkills = collectStudentSkills(req.user, resume);
  const targetRole = req.body.targetRole || req.user.profile?.dreamRole || '';

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
