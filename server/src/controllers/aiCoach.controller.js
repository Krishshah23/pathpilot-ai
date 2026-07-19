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

function buildFallbackNarrative({ user, resume, pathScore }) {
  const firstName = user.name ? user.name.split(' ')[0] : 'there';
  const dreamRole = user.profile?.dreamRole || 'Software Engineer';
  const score = pathScore.displayScore;
  const readiness = pathScore.readiness?.label || 'Building momentum';

  const goodFactors = (pathScore.factors || []).filter(f => f.status === 'good').map(f => f.label.toLowerCase());
  const badFactors = (pathScore.factors || []).filter(f => f.status !== 'good').map(f => f.label.toLowerCase());

  let narrative = `Hi ${firstName}! Reaching a score of ${score}/100 and achieving "${readiness}" status is a solid starting point for your journey toward becoming a ${dreamRole}. 

This evaluation is calculated across several readiness factors. Your profile is showing strong performance in ${goodFactors.length > 0 ? goodFactors.join(', ') : 'initial structural setup'}. This means you have successfully established a baseline foundation that you can build upon.`;

  if (badFactors.length > 0) {
    narrative += `\n\nHowever, to progress into a highly competitive candidate, we need to focus on your remaining gaps. Particularly, improving your standing in ${badFactors.join(' and ')} will have the highest impact on lifting your overall score.`;
  }

  if (resume?.keyGaps && resume.keyGaps.length > 0) {
    narrative += `\n\nSpecifically, your resume analysis highlighted a few skill gaps: ${resume.keyGaps.slice(0, 3).join(', ')}. Addressing these target areas through project work and hands-on learning is your single best next step today. Check your Growth Roadmap for personalized tasks that target these exact areas.`;
  } else {
    narrative += `\n\nYour single best next step today is to continue building out hands-on projects and aligning your skill set with current market demands. Keep refining your application portfolio and practicing targeted interview scenarios.`;
  }

  return narrative;
}

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

  let explanation;
  try {
    explanation = await geminiExplainScore({ user, resume, pathScore });
  } catch (err) {
    console.warn('Gemini explainScore failed, using personalized fallback narrative:', err.message);
    explanation = buildFallbackNarrative({ user, resume, pathScore });
  }

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

  let response;
  try {
    response = await geminiChat({ user, resume, roadmap, history, message });
  } catch (err) {
    console.warn('Gemini chat failed, using fallback coach response:', err.message);
    response = `I'm sorry, I'm experiencing high traffic right now and couldn't process that message. Please try asking again in a few seconds! If you have specific questions about your Path Score or roadmap, I will be ready to help shortly.`;
  }

  return sendSuccess(res, { data: { response } });
});

/**
 * POST /api/ai-coach/interview/question
 * Generates a role-specific interview question targeting a known gap.
 * If resume has keyGaps, uses those. Otherwise generates based on role.
 */
export const generateInterviewQuestion = asyncHandler(async (req, res) => {
  const { previousQuestions = [], difficulty = 'mid', gapIndex = 0, targetRole: clientRole } = req.body;
  const user = req.user;
  // Prefer the role the client explicitly selected; fall back to profile
  const dreamRole = clientRole || user.profile.dreamRole || 'Software Engineer';

  const resume = await Resume.findOne({ user: user._id }).sort({ createdAt: -1 });
  const keyGaps = resume?.keyGaps || [];

  // Target the specific gap if available, else use a general role gap
  const targetGap = keyGaps[gapIndex]
    || `General ${dreamRole} competency`;

  let questionData;
  try {
    questionData = await geminiGenerateQuestion({
      targetRole: dreamRole,
      gap: targetGap,
      previousQuestions,
      difficulty,
    });
  } catch (err) {
    console.warn('Gemini generateQuestion failed, using fallback question:', err.message);
    questionData = {
      question: `Describe a time when you had to work with or implement a feature involving: ${targetGap}. How did you handle it and what was the outcome?`,
      questionType: 'behavioral',
      whatWereTesting: targetGap,
      goodAnswerShouldContain: [
        'Clear context and explanation of the technology',
        'Your specific responsibilities and actions taken',
        'The final result and any lessons learned'
      ],
      rubric: {
        relevance: 30,
        depth: 40,
        communication: 30
      },
      hint: 'Focus on explaining the challenge clearly, your specific thought process, and what you achieved.'
    };
  }

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

  let evaluation;
  try {
    evaluation = await geminiEvaluateAnswer({
      question,
      answer,
      targetRole: dreamRole,
      rubric,
      questionType,
    });
  } catch (err) {
    console.warn('Gemini evaluateAnswer failed, using fallback evaluation:', err.message);
    const wordCount = answer.split(/\s+/).filter(Boolean).length;
    const depthScore = Math.min(Math.round(wordCount / 5), 40);
    const relevanceScore = wordCount > 10 ? 25 : 10;
    const communicationScore = wordCount > 15 ? 25 : 10;
    const totalScore = relevanceScore + depthScore + communicationScore;
    const grade = totalScore >= 80 ? 'Excellent' : totalScore >= 60 ? 'Good' : totalScore >= 40 ? 'Average' : 'Needs Work';

    evaluation = {
      scores: {
        relevance: relevanceScore,
        depth: depthScore,
        communication: communicationScore
      },
      totalScore,
      grade,
      strengths: ['You provided a detailed answer showing good initial understanding of the context.'],
      improvements: ['Consider elaborating more on your specific hands-on experience and implementation details.'],
      modelAnswer: 'A strong answer would follow the STAR framework (Situation, Task, Action, Result) to clearly articulate the problem, action, and results.',
      encouragement: 'Great effort! Keep practicing structured interview answers.'
    };
  }

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
