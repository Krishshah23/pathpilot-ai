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
import { geminiAnalyzeResume, geminiExplainScore, geminiParseFallback } from '../services/gemini.service.js';
import { buildPathScore } from '../services/pathScore.service.js';

/**
 * Resume Intelligence pipeline:
 *   1. store uploaded file (multer)
 *   2. extract raw text (Node)
 *   3. send text to Django for parsing + health + suggestions
 *   4. persist a Resume analysis document and update the user's resume pointer
 */

// POST /api/resume/analyze  (multipart: field "file")
export const analyzeResume = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No resume uploaded');

  const fileUrl = publicUrl('resume', req.file.filename);
  const absPath = path.join(process.cwd(), 'uploads', 'resumes', req.file.filename);

  // 2. extract text + any embedded link annotations
  const extracted = await extractResumeText(absPath, req.file.originalname);
  const text = extracted.text || '';
  const links = extracted.links || [];

  // 3. call Django ML service (include links so Django can detect anchor-style URLs)
  let aiResponse = await aiService.parseResume({ text, links });
  let parsed = aiResponse?.data;

  // Fallback to Gemini if text length is low or parsing returns lowText/low quality
  if (!parsed || parsed.lowText || (parsed.skills?.length === 0 && parsed.projects?.length === 0)) {
    console.log('[Fallback Parser] Django parsing returned low quality or low text. Invoking Gemini Fallback Parser...');
    const fallbackParsed = await geminiParseFallback(text);
    if (fallbackParsed) {
      parsed = fallbackParsed;
    }
  }

  if (!parsed) {
    throw new ApiError(502, 'AI service returned no analysis and fallback parsing failed.');
  }

  // 4. persist
  const redFlags = detectRedFlags(text, parsed);

  // ── Gemini Intelligence Layer ────────────────────────────────────
  // Django parsed the structure. Gemini now adds role-specific intelligence:
  // gaps, fit score, ATS keywords, personalized recommendations.
  const targetRole = req.user.profile?.dreamRole || 'Software Engineer';
  const geminiInsights = await geminiAnalyzeResume({
    resumeText: text,
    parsedData: parsed,
    targetRole,
    skills: parsed.skills || [],
  });

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
    // Gemini AI insights
    roleFitScore: geminiInsights.roleFitScore ?? null,
    keyGaps: geminiInsights.keyGaps ?? [],
    strengthAreas: geminiInsights.strengthAreas ?? [],
    atsKeywordsMissing: geminiInsights.atsKeywordsMissing ?? [],
    aiRecommendations: geminiInsights.recommendations ?? [],
    nextStepPriority: geminiInsights.nextStepPriority ?? '',
  });

  // Keep the user's active resume pointer in sync.
  req.user.profile.resumeUrl = fileUrl;
  await req.user.save();

  // Pre-generate the AI score explanation narrative so Overview page load is instant
  try {
    const pathScore = buildPathScore(req.user, resume);
    const explanation = await geminiExplainScore({ user: req.user, resume, pathScore });
    if (explanation) {
      resume.aiNarrative = explanation;
      await resume.save();
    }
  } catch (err) {
    // Fail silently so upload succeeds even if Gemini narrative generation times out
    console.error('Failed to pre-generate Gemini narrative:', err);
  }

  // Create notification
  await Notification.create({
    user: req.user._id,
    title: 'Resume Processed',
    message: `Your resume analysis is ready with score ${resume.healthScore}.`,
    type: 'success',
  });

  return sendSuccess(res, {
    statusCode: 201,
    message: parsed.lowText
      ? 'Resume uploaded, but we could not read enough text from it.'
      : 'Resume analyzed successfully',
    data: { resume },
  });
});

// GET /api/resume  — latest analysis for the current user
export const getLatestResume = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  return sendSuccess(res, { data: { resume } });
});

// GET /api/resume/history  — all analyses (for tracking improvement over time)
export const getResumeHistory = asyncHandler(async (req, res) => {
  const history = await Resume.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .select('healthScore createdAt originalName');
  return sendSuccess(res, { data: { history } });
});

// POST /api/resume/reanalyze  — re-run Gemini role analysis for a new targetRole
// Body: { targetRole: string }
// Does NOT require a new file upload — uses the existing resume on disk.
export const reanalyzeForRole = asyncHandler(async (req, res) => {
  const { targetRole } = req.body;
  if (!targetRole?.trim()) throw ApiError.badRequest('targetRole is required');

  // Find the latest resume document for this user
  const resume = await Resume.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  if (!resume) throw new ApiError(404, 'No resume found. Please upload a resume first.');

  // Re-extract text from the stored file
  const filename = resume.fileUrl.split('/').pop();
  const absPath = path.join(process.cwd(), 'uploads', 'resumes', filename);

  let resumeText = '';
  try {
    const extracted = await extractResumeText(absPath, resume.originalName);
    resumeText = extracted.text || '';
  } catch {
    // File may have been cleaned up — fall back to skill list so Gemini still works
    resumeText = `Skills: ${(resume.skills || []).join(', ')}. Experience: ${(resume.experience || []).join('. ')}`;
  }

  // Re-run Gemini analysis against the new role
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

  // Patch the live resume document with the new role-specific intelligence
  resume.roleFitScore = geminiInsights.roleFitScore ?? null;
  resume.keyGaps = geminiInsights.keyGaps ?? [];
  resume.strengthAreas = geminiInsights.strengthAreas ?? [];
  resume.atsKeywordsMissing = geminiInsights.atsKeywordsMissing ?? [];
  resume.aiRecommendations = geminiInsights.recommendations ?? [];
  resume.nextStepPriority = geminiInsights.nextStepPriority ?? '';
  resume.aiNarrative = ''; // Invalidate cached audit narrative so dashboard regenerates narrative for new role
  await resume.save();


  return sendSuccess(res, {
    message: `Analysis updated for ${targetRole}`,
    data: { resume },
  });
});
