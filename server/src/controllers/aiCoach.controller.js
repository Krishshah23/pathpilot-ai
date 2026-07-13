import { Resume } from '../models/Resume.js';
import { GrowthPlan } from '../models/GrowthPlan.js';
import { InterviewSession } from '../models/InterviewSession.js';
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

  // Return cached narrative if available — avoids re-calling Gemini on every page load
  if (resume?.aiNarrative) {
    const metrics = pathScore.factors.map((f) => ({
      name: f.label,
      value: f.score,
      max: f.max,
      impact: f.status === 'good' ? 'positive' : 'negative',
    }));
    return sendSuccess(res, { data: { explanation: resume.aiNarrative, metrics, cached: true } });
  }

  const explanation = await geminiExplainScore({ user, resume, pathScore });

  // Persist the narrative so future calls skip the Gemini API entirely
  if (resume && explanation) {
    await Resume.findByIdAndUpdate(resume._id, { aiNarrative: explanation });
  }

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

/**
 * POST /api/ai-coach/interview/save-session
 * Persists a completed interview session to MongoDB for historical tracking.
 */
export const saveInterviewSession = asyncHandler(async (req, res) => {
  const { questions, gapsAddressed } = req.body;
  const user = req.user;

  if (!questions?.length) throw ApiError.badRequest('No questions to save');

  const totalQuestions = questions.length;
  const averageScore = Math.round(
    questions.reduce((sum, q) => sum + (q.totalScore || 0), 0) / totalQuestions
  );

  const session = await InterviewSession.create({
    user: user._id,
    targetRole: user.profile?.dreamRole || 'Software Engineer',
    gapsAddressed: gapsAddressed || [],
    questions,
    totalQuestions,
    averageScore,
    completedAt: new Date(),
  });

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Session saved',
    data: { session: { _id: session._id, averageScore, totalQuestions, targetRole: session.targetRole } },
  });
});

/**
 * GET /api/ai-coach/interview/sessions
 * Returns the user's past interview sessions (most recent first).
 */
export const getInterviewSessions = asyncHandler(async (req, res) => {
  const sessions = await InterviewSession.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('targetRole averageScore totalQuestions gapsAddressed completedAt createdAt');

  return sendSuccess(res, { data: { sessions } });
});
