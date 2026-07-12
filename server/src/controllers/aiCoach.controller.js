import { Resume } from '../models/Resume.js';
import { GrowthPlan } from '../models/GrowthPlan.js';
import { buildPathScore, collectStudentSkills } from '../services/pathScore.service.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  geminiChat,
  geminiExplainScore,
  geminiGenerateQuestion,
  geminiEvaluateAnswer,
} from '../services/gemini.service.js';

/**
 * POST /api/ai-coach/explain
 * Gemini-powered score explanation — replaces the fake "synthetic SHAP" narrative.
 */
export const explainScore = asyncHandler(async (req, res) => {
  const user = req.user;
  const resume = await Resume.findOne({ user: user._id }).sort({ createdAt: -1 });
  const pathScore = buildPathScore(user, resume);

  const explanation = await geminiExplainScore({ user, resume, pathScore });

  const metrics = pathScore.factors.map((f) => ({
    name: f.label,
    value: f.score,
    max: f.max,
    impact: f.status === 'good' ? 'positive' : 'negative',
  }));

  return sendSuccess(res, { data: { explanation, metrics } });
});

/**
 * POST /api/ai-coach/chat
 * Real AI chat — Gemini with full user context injected every call.
 * Replaces ~250 lines of hardcoded if/else keyword matching.
 */
export const chat = asyncHandler(async (req, res) => {
  const { message, history } = req.body;
  const user = req.user;

  if (!message?.trim()) throw ApiError.badRequest('Message is required');

  const resume = await Resume.findOne({ user: user._id }).sort({ createdAt: -1 });
  const roadmap = await GrowthPlan.findOne({ user: user._id });

  const response = await geminiChat({ user, resume, roadmap, history, message });

  return sendSuccess(res, { data: { response } });
});

/**
 * POST /api/ai-coach/interview/question
 * Generates a role-specific interview question targeting a known gap.
 * If resume has keyGaps, uses those. Otherwise generates based on role.
 */
export const generateInterviewQuestion = asyncHandler(async (req, res) => {
  const { previousQuestions = [], difficulty = 'mid', gapIndex = 0 } = req.body;
  const user = req.user;
  const dreamRole = user.profile.dreamRole || 'Software Engineer';

  const resume = await Resume.findOne({ user: user._id }).sort({ createdAt: -1 });
  const keyGaps = resume?.keyGaps || [];

  // Target the specific gap if available, else use a general role gap
  const targetGap = keyGaps[gapIndex]
    || `General ${dreamRole} competency`;

  const questionData = await geminiGenerateQuestion({
    targetRole: dreamRole,
    gap: targetGap,
    previousQuestions,
    difficulty,
  });

  return sendSuccess(res, {
    data: {
      ...questionData,
      gapAddressed: targetGap,
      totalGaps: keyGaps.length,
      gapIndex,
    },
  });
});

/**
 * POST /api/ai-coach/interview/evaluate
 * Evaluates an interview answer using Gemini with a role-specific rubric.
 */
export const evaluateInterviewAnswer = asyncHandler(async (req, res) => {
  const { question, answer, rubric, questionType } = req.body;
  const user = req.user;
  const dreamRole = user.profile.dreamRole || 'Software Engineer';

  if (!question || !answer?.trim()) {
    throw ApiError.badRequest('Question and answer are required');
  }

  const evaluation = await geminiEvaluateAnswer({
    question,
    answer,
    targetRole: dreamRole,
    rubric,
    questionType,
  });

  return sendSuccess(res, { data: evaluation });
});
