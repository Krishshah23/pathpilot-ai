/**
 * controllers/resume.controller.js — Resume Processing & Analysis Controller
 *
 * PIPELINE WORKFLOW (9 Steps):
 * 1. File Upload — Multer stores file on disk (`uploads/resumes/`).
 * 2. Text Extraction — Node extracts plain text & hyperlinked annotations (`resumeText.service.js`).
 * 3. Structure Parsing — Sends text to Django ML service (`parseResume`).
 *    Fallback Parser: If text length is < 30 words or parsing fails, invokes Gemini fallback (`geminiParseFallback`).
 * 4. Red Flag Detection — Evaluates 5 recruiter red flag heuristics (`resumeRedFlags.js`).
 * 5. Gemini AI Intelligence — Generates role-fit score, missing ATS keywords, and recommendations (`geminiAnalyzeResume`).
 * 6. DB Persistence — Saves new `Resume` document in MongoDB.
 * 7. Active Pointer Sync — Updates `user.profile.resumeUrl`.
 * 8. Pre-calculated Narrative — Pre-generates Path Score audit explanation narrative (`geminiExplainScore`).
 * 9. Notification Trigger — Emits success notification to the user's drawer.
 */

import path from 'node:path';
import { Resume } from '../models/Resume.js';
import { Notification } from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { publicUrl } from '../middleware/upload.middleware.js';
import { extractResumeText } from '../services/resumeText.service.js';
import { aiService } from '../services/ai.service.js';
import { detectRedFlags } from '../services/resumeRedFlags.js';
import { geminiAnalyzeResume, geminiExplainScore, geminiParseFallback, geminiValidateParsedResume } from '../services/gemini.service.js';
import { buildPathScore, recomputePathScoreCache } from '../services/pathScore.service.js';
import { notify, notifyOnce } from '../services/notification.service.js';

// Minimum displayScore change (points) before a "your score changed" notification fires.
// Below this, day-to-day noise (e.g. a re-upload with near-identical content) wouldn't
// be a meaningful enough signal to interrupt the user.
const SIGNIFICANT_SCORE_DELTA = 5;

/**
 * POST /api/resume/analyze
 * Executes the full 9-step resume processing and analysis pipeline.
 */
export const analyzeResume = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No resume uploaded');

  const fileUrl = publicUrl('resume', req.file.filename);
  const absPath = path.join(process.cwd(), 'uploads', 'resumes', req.file.filename);

  // Step 2: Extract text and hyperlinks
  const extracted = await extractResumeText(absPath, req.file.originalname);
  const text = extracted.text || '';
  const links = extracted.links || [];

  // Step 3: Parse structure via Django ML service with Gemini fallback on failure
  let parsed = null;
  try {
    const aiResponse = await aiService.parseResume({ text, links });
    parsed = aiResponse?.data;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[Resume Controller] Django AI service parse failed, falling back to Gemini parser:', err.message);
  }

  // Fallback to Gemini if text length is low or parsing returns low quality or failed
  if (!parsed || parsed.lowText || (parsed.skills?.length === 0 && parsed.projects?.length === 0)) {
    // eslint-disable-next-line no-console
    console.log('[Fallback Parser] Invoking Gemini Fallback Parser...');
    const fallbackParsed = await geminiParseFallback(text);
    if (fallbackParsed) {
      parsed = fallbackParsed;
    }
  }

  if (!parsed) {
    throw new ApiError(502, 'AI service returned no analysis and fallback parsing failed.');
  }

  // Step 3b: Lightweight sanity check — catches multi-column/table parsing
  // mistakes (merged skills, garbled project titles) before we persist.
  // Skipped for essentially-empty parses (nothing worth validating) and never
  // blocks the pipeline if the check itself fails.
  let lowConfidenceFields = [];
  const hasContentToValidate = (parsed.skills?.length || parsed.projects?.length || parsed.experience?.length || parsed.education?.length);
  if (hasContentToValidate) {
    const validated = await geminiValidateParsedResume({ rawText: text, parsed });
    parsed = {
      ...parsed,
      skills: validated.skills,
      education: validated.education,
      experience: validated.experience,
      projects: validated.projects,
    };
    lowConfidenceFields = validated.lowConfidenceFields;
  }

  // Step 4: Red flag detection heuristics
  const redFlags = detectRedFlags(text, parsed);

  // Step 5: Gemini AI Intelligence Layer
  const targetRole = req.user.profile?.dreamRole || 'Software Engineer';
  const geminiInsights = await geminiAnalyzeResume({
    resumeText: text,
    parsedData: parsed,
    targetRole,
    skills: parsed.skills || [],
  });

  // Step 6: Save Resume document
  const resume = await Resume.create({
    user: req.user._id,
    fileUrl,
    originalName: req.file.originalname,
    skills: parsed.skills,
    education: parsed.education,
    projects: parsed.projects,
    experience: parsed.experience,
    certifications: parsed.certifications,
    contact: parsed.contact,
    healthScore: parsed.health?.score ?? 0,
    healthBreakdown: parsed.health?.breakdown ?? [],
    suggestions: parsed.suggestions,
    redFlags,
    wordCount: parsed.wordCount,
    lowText: parsed.lowText,
    lowConfidenceFields,
    roleFitScore: geminiInsights.roleFitScore ?? null,
    keyGaps: geminiInsights.keyGaps ?? [],
    strengthAreas: geminiInsights.strengthAreas ?? [],
    atsKeywordsMissing: geminiInsights.atsKeywordsMissing ?? [],
    aiRecommendations: geminiInsights.recommendations ?? [],
    nextStepPriority: geminiInsights.nextStepPriority ?? '',
  });

  // Step 7: Update active profile pointer
  req.user.profile.resumeUrl = fileUrl;
  await req.user.save();

  // Step 8: Pre-generate Path Score explanation narrative
  let pathScore = buildPathScore(req.user, resume);
  try {
    const explanation = await geminiExplainScore({ user: req.user, resume, pathScore });
    if (explanation) {
      resume.aiNarrative = explanation;
      await resume.save();
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to pre-generate Gemini narrative:', err);
  }

  // Step 9: Refresh cached Path Score + emit notifications
  await Notification.create({
    user: req.user._id,
    title: 'Resume Processed',
    message: `Your resume analysis is ready with score ${resume.healthScore}.`,
    type: 'success',
  });

  // Milestone: first resume ever analyzed (this Resume doc was just created, so a
  // count of 1 means it's the first).
  const resumeCount = await Resume.countDocuments({ user: req.user._id });
  if (resumeCount === 1) {
    await notifyOnce(req.user._id, {
      title: 'Milestone: first resume analyzed',
      message: "You've analyzed your first resume on PathPilot — that's the foundation your whole readiness score builds on.",
      type: 'success',
      actionLink: '/dashboard',
      lookbackDays: 3650,
    });
  }

  try {
    const { previous, current } = await recomputePathScoreCache(req.user, resume);
    if (previous) {
      const delta = current.displayScore - previous.displayScore;
      if (Math.abs(delta) >= SIGNIFICANT_SCORE_DELTA) {
        const direction = delta > 0 ? 'up' : 'down';
        await notify(req.user._id, {
          type: delta > 0 ? 'success' : 'warning',
          title: `Path Score ${direction === 'up' ? 'increased' : 'decreased'} ${Math.abs(delta)} points`,
          message: `Your Path Score is now ${current.displayScore}/100 (was ${previous.displayScore}), driven mainly by this resume analysis.`,
          actionLink: '/dashboard',
        });
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to refresh Path Score cache / send delta notification:', err);
  }

  return sendSuccess(res, {
    statusCode: 201,
    message: parsed.lowText
      ? 'Resume uploaded, but we could not read enough text from it.'
      : 'Resume analyzed successfully',
    data: { resume },
  });
});

/**
 * GET /api/resume
 * Returns candidate's most recent active resume analysis.
 */
export const getLatestResume = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  return sendSuccess(res, { data: { resume } });
});

/**
 * GET /api/resume/history
 * Returns historical resume analyses for score progression tracking over time.
 */
export const getResumeHistory = asyncHandler(async (req, res) => {
  const history = await Resume.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .select('healthScore createdAt originalName');
  return sendSuccess(res, { data: { history } });
});

/**
 * POST /api/resume/reanalyze
 * Re-runs Gemini role analysis against an existing uploaded resume for a new target role.
 */
export const reanalyzeForRole = asyncHandler(async (req, res) => {
  const { targetRole } = req.body;
  if (!targetRole?.trim()) throw ApiError.badRequest('targetRole is required');

  const resume = await Resume.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  if (!resume) throw new ApiError(404, 'No resume found. Please upload a resume first.');

  const filename = resume.fileUrl.split('/').pop();
  const absPath = path.join(process.cwd(), 'uploads', 'resumes', filename);

  let resumeText = '';
  try {
    const extracted = await extractResumeText(absPath, resume.originalName);
    resumeText = extracted.text || '';
  } catch {
    resumeText = `Skills: ${(resume.skills || []).join(', ')}. Experience: ${(resume.experience || []).join('. ')}`;
  }

  const parsedData = {
    skills: resume.skills,
    projects: resume.projects,
    experience: resume.experience,
    education: resume.education,
    certifications: resume.certifications,
  };

  const geminiInsights = await geminiAnalyzeResume({
    resumeText,
    parsedData,
    targetRole,
    skills: resume.skills || [],
  });

  resume.roleFitScore = geminiInsights.roleFitScore ?? null;
  resume.keyGaps = geminiInsights.keyGaps ?? [];
  resume.strengthAreas = geminiInsights.strengthAreas ?? [];
  resume.atsKeywordsMissing = geminiInsights.atsKeywordsMissing ?? [];
  resume.aiRecommendations = geminiInsights.recommendations ?? [];
  resume.nextStepPriority = geminiInsights.nextStepPriority ?? '';
  resume.aiNarrative = ''; // Invalidate cached narrative so Overview regenerates narrative for new role
  await resume.save();

  return sendSuccess(res, {
    message: `Analysis updated for ${targetRole}`,
    data: { resume },
  });
});
