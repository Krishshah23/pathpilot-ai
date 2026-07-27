/**
 * controllers/aiCoach.controller.js — Gemini AI Coach & Interview Prep Controller
 *
 * ARCHITECTURAL ROLE:
 * Handles AI career coaching chat, pre-generated Path Score audit narrative explanations,
 * mock interview question generation, answer evaluation, and session persistence:
 * 1. `explainScore`: Pre-generates Gemini score explanation narrative and caches it on the active `Resume` document.
 * 2. `chat`: Context-aware career coach chat with full user profile + resume + roadmap context injected.
 * 3. `generateInterviewQuestion`: Creates targeted role-specific interview question for identified gap.
 * 4. `evaluateInterviewAnswer`: Evaluates candidate answer against multi-dimensional rubric (relevance, depth, communication).
 * 5. `saveInterviewSession` / `getInterviewSessions`: Persists and retrieves mock interview session history.
 */

import { Resume } from '../models/Resume.js';
import { GrowthPlan } from '../models/GrowthPlan.js';
import { InterviewSession } from '../models/InterviewSession.js';
import { buildPathScore } from '../services/pathScore.service.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  geminiChat,
  geminiExplainScore,
  geminiGenerateQuestion,
  geminiEvaluateAnswer,
} from '../services/gemini.service.js';
import { notify, notifyOnce } from '../services/notification.service.js';

// Session counts at which a milestone notification fires (in addition to the
// per-session encouragement notification that always fires).
const INTERVIEW_MILESTONES = [1, 5];

/** Fallback narrative builder if Gemini API fails during score explanation. */
function buildFallbackNarrative({ user, resume, pathScore }) {
  const firstName = user.name ? user.name.split(' ')[0] : 'there';
  const dreamRole = user.profile?.dreamRole || 'Software Engineer';
  const score = pathScore.displayScore;
  const readiness = pathScore.readiness?.label || 'Building momentum';

  const goodFactors = (pathScore.factors || []).filter((f) => f.status === 'good').map((f) => f.label.toLowerCase());
  const badFactors = (pathScore.factors || []).filter((f) => f.status !== 'good').map((f) => f.label.toLowerCase());

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
 * Generates and caches Gemini Path Score explanation narrative.
 */
export const explainScore = asyncHandler(async (req, res) => {
  const user = req.user;
  const resume = await Resume.findOne({ user: user._id }).sort({ createdAt: -1 });
  const pathScore = buildPathScore(user, resume);

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
    // eslint-disable-next-line no-console
    console.warn('Gemini explainScore failed, using personalized fallback narrative:', err.message);
    explanation = buildFallbackNarrative({ user, resume, pathScore });
  }

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
 * Context-injected interactive career coach chat.
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
    // eslint-disable-next-line no-console
    console.warn('Gemini chat failed, using fallback coach response:', err.message);
    response = `I'm sorry, I'm experiencing high traffic right now and couldn't process that message. Please try asking again in a few seconds! If you have specific questions about your Path Score or roadmap, I will be ready to help shortly.`;
  }

  return sendSuccess(res, { data: { response } });
});

/**
 * POST /api/ai-coach/interview/question
 * Generates targeted mock interview question.
 */
export const generateInterviewQuestion = asyncHandler(async (req, res) => {
  const { previousQuestions = [], difficulty = 'mid', gapIndex = 0, targetRole: clientRole } = req.body;
  const user = req.user;
  const dreamRole = clientRole || user.profile.dreamRole || 'Software Engineer';

  const resume = await Resume.findOne({ user: user._id }).sort({ createdAt: -1 });
  const keyGaps = resume?.keyGaps || [];

  const targetGap = keyGaps[gapIndex] || `General ${dreamRole} competency`;

  let questionData;
  try {
    questionData = await geminiGenerateQuestion({
      targetRole: dreamRole,
      gap: targetGap,
      previousQuestions,
      difficulty,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Gemini generateQuestion failed, using fallback question:', err.message);
    questionData = {
      question: `Describe a time when you had to work with or implement a feature involving: ${targetGap}. How did you handle it and what was the outcome?`,
      questionType: 'behavioral',
      whatWereTesting: targetGap,
      goodAnswerShouldContain: [
        'Clear context and explanation of the technology',
        'Your specific responsibilities and actions taken',
        'The final result and any lessons learned',
      ],
      rubric: {
        relevance: 30,
        depth: 40,
        communication: 30,
      },
      hint: 'Focus on explaining the challenge clearly, your specific thought process, and what you achieved.',
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
 * Evaluates candidate interview response using Gemini scoring rubric.
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
    // eslint-disable-next-line no-console
    console.warn('Gemini evaluateAnswer failed, using fallback evaluation:', err.message);
    const wordCount = answer.split(/\s+/).filter(Boolean).length;
    const depthScore = Math.min(Math.round(wordCount / 5), 40);
    const relevanceScore = wordCount > 10 ? 25 : 10;
    const communicationScore = wordCount > 15 ? 25 : 10;
    const totalScore = relevanceScore + depthScore + communicationScore;
    const grade =
      totalScore >= 80
        ? 'Excellent'
        : totalScore >= 60
        ? 'Good'
        : totalScore >= 40
        ? 'Average'
        : 'Needs Work';

    evaluation = {
      scores: {
        relevance: relevanceScore,
        depth: depthScore,
        communication: communicationScore,
      },
      totalScore,
      grade,
      strengths: ['You provided a detailed answer showing good initial understanding of the context.'],
      improvements: [
        'Consider elaborating more on your specific hands-on experience and implementation details.',
      ],
      modelAnswer:
        'A strong answer would follow the STAR framework (Situation, Task, Action, Result) to clearly articulate the problem, action, and results.',
      encouragement: 'Great effort! Keep practicing structured interview answers.',
    };
  }

  return sendSuccess(res, { data: evaluation });
});

/**
 * POST /api/ai-coach/interview/save-session
 * Persists completed interview session to MongoDB.
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

  // Encouraging notification — fires every time a session is completed.
  await notify(user._id, {
    type: 'success',
    title: 'Mock interview complete',
    message: `You scored ${averageScore}/100 across ${totalQuestions} question${totalQuestions === 1 ? '' : 's'}. Review your feedback to sharpen your next answer.`,
    actionLink: '/interview-prep',
  });

  // Milestone notification — fires once at 1st and 5th completed sessions.
  const sessionCount = await InterviewSession.countDocuments({ user: user._id });
  if (INTERVIEW_MILESTONES.includes(sessionCount)) {
    await notifyOnce(user._id, {
      title: sessionCount === 1 ? 'Milestone: first mock interview done' : `Milestone: ${sessionCount} mock interviews done`,
      message:
        sessionCount === 1
          ? "You've completed your first mock interview — consistent practice is what moves the needle."
          : `${sessionCount} sessions in — your interview stamina is building. Keep going.`,
      type: 'success',
      actionLink: '/interview-prep',
      lookbackDays: 3650,
    });
  }

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Session saved',
    data: { session: { _id: session._id, averageScore, totalQuestions, targetRole: session.targetRole } },
  });
});

/**
 * GET /api/ai-coach/interview/sessions
 * Retrieves past interview session history for the candidate (summary only —
 * no question/answer detail, see getInterviewSessionDetail for that).
 */
export const getInterviewSessions = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const sessions = await InterviewSession.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('targetRole averageScore totalQuestions gapsAddressed completedAt createdAt');

  return sendSuccess(res, { data: { sessions } });
});

/**
 * GET /api/ai-coach/interview/sessions/:id
 * Retrieves one full session including every question, answer, and AI feedback —
 * powers the "Review" button on the Interview Analytics history table.
 */
export const getInterviewSessionDetail = asyncHandler(async (req, res) => {
  const session = await InterviewSession.findOne({ _id: req.params.id, user: req.user._id });
  if (!session) throw ApiError.notFound('Interview session not found');
  return sendSuccess(res, { data: { session } });
});

// Question categories tracked for the topic breakdown radar chart. 'general' covers
// sessions saved before questionType was persisted, or fallback questions.
const TOPIC_CATEGORIES = ['technical', 'behavioral', 'situational', 'general'];
const TOPIC_LABELS = {
  technical: 'Technical',
  behavioral: 'Behavioral',
  situational: 'Situational',
  general: 'General',
};

/**
 * GET /api/ai-coach/interview/analytics
 * Computes score-over-time, topic breakdown, and improvement insights across every
 * completed session. Degrades gracefully (hasData: false) for users with no sessions.
 */
export const getInterviewAnalytics = asyncHandler(async (req, res) => {
  const sessions = await InterviewSession.find({ user: req.user._id }).sort({ completedAt: 1 });

  if (sessions.length === 0) {
    return sendSuccess(res, { data: { analytics: { hasData: false, totalSessions: 0 } } });
  }

  const scoreOverTime = sessions.map((s, i) => ({
    index: i + 1,
    date: s.completedAt,
    score: s.averageScore,
    role: s.targetRole,
  }));

  // Flatten every question across every session, tagged with its session index
  // (chronological order) so we can compare "earlier" vs "recent" per topic.
  const allQuestions = sessions.flatMap((s, sessionIdx) =>
    (s.questions || []).map((q) => ({
      ...q.toObject(),
      sessionIdx,
    }))
  );

  const topicBreakdown = TOPIC_CATEGORIES.map((key) => {
    const qs = allQuestions.filter((q) => (q.questionType || 'general') === key);
    const avgScore = qs.length
      ? Math.round(qs.reduce((sum, q) => sum + (q.totalScore || 0), 0) / qs.length)
      : 0;
    return { key, category: TOPIC_LABELS[key], avgScore, count: qs.length };
  }).filter((t) => t.count > 0);

  // Improvement highlight: for the topic with the most data, compare the average of
  // its most recent 3 answers vs the 3 before that. Needs 6+ answers in one topic.
  let improvementHighlight = null;
  const richestTopic = [...topicBreakdown].sort((a, b) => b.count - a.count)[0];
  if (richestTopic && richestTopic.count >= 6) {
    const topicQuestions = allQuestions.filter((q) => (q.questionType || 'general') === richestTopic.key);
    const recent3 = topicQuestions.slice(-3);
    const prior3 = topicQuestions.slice(-6, -3);
    const recentAvg = recent3.reduce((sum, q) => sum + (q.totalScore || 0), 0) / recent3.length;
    const priorAvg = prior3.reduce((sum, q) => sum + (q.totalScore || 0), 0) / prior3.length;
    if (priorAvg > 0) {
      const pctChange = Math.round(((recentAvg - priorAvg) / priorAvg) * 100);
      if (pctChange >= 10) {
        improvementHighlight = `Your ${richestTopic.category} answers improved ${pctChange}% over your last 3 sessions in that category.`;
      }
    }
  }

  // Recommended focus: the topic with the lowest average score (among topics with data).
  let recommendedFocus = null;
  if (topicBreakdown.length > 0) {
    const weakest = [...topicBreakdown].sort((a, b) => a.avgScore - b.avgScore)[0];
    recommendedFocus = `Based on your performance, focus on ${weakest.category} questions next.`;
  }

  return sendSuccess(res, {
    data: {
      analytics: {
        hasData: true,
        totalSessions: sessions.length,
        scoreOverTime,
        topicBreakdown,
        improvementHighlight,
        recommendedFocus,
      },
    },
  });
});
