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

  // 2. extract text
  const text = await extractResumeText(absPath, req.file.originalname);

  // 3. call Django ML service
  const aiResponse = await aiService.parseResume({ text });
  const parsed = aiResponse?.data;
  if (!parsed) {
    // A response without `data` means Django is running outdated code (the old
    // Phase-1 stub). Surface an actionable message instead of a bare 502.
    throw new ApiError(
      502,
      aiResponse?.implemented === false
        ? 'The AI service is running outdated code. Please restart the Django service.'
        : 'AI service returned no analysis'
    );
  }

  // 4. persist
  const redFlags = detectRedFlags(text, parsed);

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
  });

  // Keep the user's active resume pointer in sync.
  req.user.profile.resumeUrl = fileUrl;
  await req.user.save();

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
