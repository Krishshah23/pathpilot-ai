/**
 * controllers/resumeBuilder.controller.js — Resume Builder Controller
 *
 * ARCHITECTURAL ROLE:
 * Backs the /resume-builder editor: creation (3 entry modes), section editing,
 * AI-assisted writing (rewrite bullet / generate summary / optimize / JD match),
 * live ATS scoring, and PDF/DOCX/text export.
 *
 * ONE DOCUMENT PER USER (upsert), same pattern as GrowthPlan — see ResumeBuilder.js.
 */

import path from 'node:path';
import { ResumeBuilder } from '../models/ResumeBuilder.js';
import { Resume } from '../models/Resume.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { extractResumeText } from '../services/resumeText.service.js';
import { geminiParseFallback } from '../services/gemini.service.js';
import { localParseFallback, KNOWN_SKILLS } from './resume.controller.js';
import { computeAtsScore } from '../services/resumeBuilderAts.service.js';
import {
  geminiRewriteBullet,
  geminiGenerateResumeSummary,
  geminiOptimizeResume,
  geminiMatchJobDescription,
  geminiInsertKeywords,
} from '../services/gemini.service.js';
import { exportToPdf, exportToDocx, exportToText } from '../services/resumeBuilderExport.service.js';

const EDITABLE_FIELDS = ['template', 'contact', 'summary', 'experience', 'skills', 'projects', 'education'];

/** Recomputes and persists the ATS score for a ResumeBuilder document. */
async function refreshAtsScore(doc, dreamRole) {
  doc.atsScore = await computeAtsScore(doc, dreamRole);
  await doc.save();
  return doc;
}

/**
 * GET /api/resume-builder
 * Returns the candidate's resume builder document, or { exists: false } if
 * they haven't started one yet (landing screen uses this to decide what to show).
 */
export const getResumeBuilder = asyncHandler(async (req, res) => {
  const doc = await ResumeBuilder.findOne({ user: req.user._id });
  if (!doc) return sendSuccess(res, { data: { exists: false, resumeBuilder: null } });
  return sendSuccess(res, { data: { exists: true, resumeBuilder: doc } });
});

/** Maps a free-text Resume experience string (no fixed structure) into an editable entry. */
function mapLegacyExperience(text) {
  return { title: text.slice(0, 120), company: '', location: '', startDate: '', endDate: '', current: false, bullets: [] };
}

/** Maps a Resume project sub-doc {title, description} into a bulleted builder entry. */
function mapLegacyProject(p) {
  const bullets = (p.description || '')
    .split(/\n|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
  return { title: p.title || 'Project', link: '', bullets: bullets.length ? bullets : [p.description].filter(Boolean) };
}

function mapLegacyEducation(text) {
  return { degree: text.slice(0, 160), institution: '', location: '', startDate: '', endDate: '', gpa: '' };
}

// The resume parser sometimes can't find an actual URL but detects a "LinkedIn"/"GitHub"
// label in the text — it fills that field with an internal placeholder string
// ('present (label detected, no URL extracted)') rather than leaving it blank. That string
// must never be copied into user-editable/exportable content, so we drop it here at import
// time — the field just starts empty and the user can paste the real link in.
function realLinkOrEmpty(value) {
  return value && !/label detected/i.test(value) ? value : '';
}

/** Builds the initial section data for 'import' and 'migrate' modes from parsed resume data. */
function buildSectionsFromParsed({ skills, experience, projects, education, contact }, user) {
  return {
    contact: {
      name: user.name || '',
      email: contact?.email || user.email || '',
      phone: contact?.phone || '',
      location: '',
      linkedin: realLinkOrEmpty(contact?.linkedin),
      github: realLinkOrEmpty(contact?.github),
      website: '',
    },
    summary: '',
    experience: (experience || []).map(mapLegacyExperience),
    skills: skills || [],
    projects: (projects || []).map(mapLegacyProject),
    education: (education || []).map(mapLegacyEducation),
  };
}

/**
 * POST /api/resume-builder/init
 * Creates (or resets) the candidate's resume builder document from one of three modes:
 *   - 'scratch': empty editor, just contact name/email pre-filled
 *   - 'import':  copies from the latest analyzed `Resume` document
 *   - 'migrate': parses a freshly uploaded PDF/DOCX (multer 'file' field required)
 */
export const initResumeBuilder = asyncHandler(async (req, res) => {
  const { mode } = req.body;
  if (!['scratch', 'import', 'migrate'].includes(mode)) {
    throw ApiError.badRequest('mode must be one of: scratch, import, migrate');
  }

  let sections;

  if (mode === 'scratch') {
    sections = {
      contact: { name: req.user.name || '', email: req.user.email || '', phone: '', location: '', linkedin: '', github: '', website: '' },
      summary: '', experience: [], skills: req.user.profile?.skills || [], projects: [], education: [],
    };
  } else if (mode === 'import') {
    const resume = await Resume.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    if (!resume) throw ApiError.badRequest('No analyzed resume found on your profile yet — upload one on Resume Strategy first, or start from scratch.');
    sections = buildSectionsFromParsed(resume, req.user);
  } else {
    if (!req.file) throw ApiError.badRequest('Upload a PDF or Word resume to migrate.');
    const absPath = path.join(process.cwd(), 'uploads', 'resumes', req.file.filename);
    const extracted = await extractResumeText(absPath, req.file.originalname);
    let parsed = await geminiParseFallback(extracted.text || '');
    if (!parsed) parsed = localParseFallback(extracted.text || '');
    if (!parsed) throw new ApiError(502, 'Could not parse that file. Try a text-based PDF or Word document.');
    sections = buildSectionsFromParsed(parsed, req.user);
  }

  const doc = await ResumeBuilder.findOneAndUpdate(
    { user: req.user._id },
    { user: req.user._id, sourceMode: mode, template: 'minimal', ...sections },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await refreshAtsScore(doc, req.user.profile?.dreamRole);

  return sendSuccess(res, { statusCode: 201, message: 'Resume builder ready', data: { resumeBuilder: doc } });
});

/**
 * PATCH /api/resume-builder
 * Updates any combination of editable sections and recomputes the ATS score.
 */
export const updateResumeBuilder = asyncHandler(async (req, res) => {
  const doc = await ResumeBuilder.findOne({ user: req.user._id });
  if (!doc) throw ApiError.notFound('No resume builder document yet — call POST /resume-builder/init first.');

  for (const field of EDITABLE_FIELDS) {
    if (req.body[field] !== undefined) doc[field] = req.body[field];
  }
  await doc.save();
  await refreshAtsScore(doc, req.user.profile?.dreamRole);

  return sendSuccess(res, { message: 'Saved', data: { resumeBuilder: doc } });
});

async function getOwnedDoc(userId) {
  const doc = await ResumeBuilder.findOne({ user: userId });
  if (!doc) throw ApiError.notFound('No resume builder document yet — call POST /resume-builder/init first.');
  return doc;
}

/**
 * POST /api/resume-builder/ai/rewrite-bullet
 * body: { bullet: string, context?: string }
 */
export const rewriteBullet = asyncHandler(async (req, res) => {
  const { bullet, context } = req.body;
  if (!bullet?.trim()) throw ApiError.badRequest('bullet text is required');

  const targetRole = req.user.profile?.dreamRole || 'Software Engineer';
  const result = await geminiRewriteBullet({ bullet, targetRole, context });
  return sendSuccess(res, { data: result });
});

/**
 * POST /api/resume-builder/ai/generate-summary
 * Generates a summary from the current draft's skills/experience/projects and saves it.
 */
export const generateSummary = asyncHandler(async (req, res) => {
  const doc = await getOwnedDoc(req.user._id);
  const targetRole = req.user.profile?.dreamRole || 'Software Engineer';

  const summary = await geminiGenerateResumeSummary({
    targetRole,
    skills: doc.skills,
    experience: doc.experience.flatMap((e) => e.bullets),
    projects: doc.projects.flatMap((p) => p.bullets),
  });

  doc.summary = summary;
  await doc.save();
  await refreshAtsScore(doc, targetRole);

  return sendSuccess(res, { data: { summary, resumeBuilder: doc } });
});

/**
 * POST /api/resume-builder/ai/optimize
 * One-click scan: returns bullet rewrite suggestions, keyword suggestions, and red
 * flags. Does NOT silently overwrite content — the client applies suggestions
 * individually so the user stays in control of their own words.
 */
export const optimizeResume = asyncHandler(async (req, res) => {
  const doc = await getOwnedDoc(req.user._id);
  const targetRole = req.user.profile?.dreamRole || 'Software Engineer';

  const result = await geminiOptimizeResume({
    targetRole,
    summary: doc.summary,
    experience: doc.experience,
    skills: doc.skills,
    missingKeywords: doc.atsScore?.missingKeywords || [],
  });

  return sendSuccess(res, { data: result });
});

/**
 * Pure keyword-overlap fallback for JD matching — zero external API dependency.
 * Used when Gemini is unavailable (all fallback models quota-exhausted/down).
 * Extracts known tech skill keywords present in the JD, then checks which
 * ones also appear in the resume text.
 */
function localMatchJobDescription(jobDescription, resumeText) {
  const jdLower = jobDescription.toLowerCase();
  const resumeLower = resumeText.toLowerCase();

  const jdKeywords = KNOWN_SKILLS.filter((s) =>
    new RegExp(`(?<![a-z0-9.#])${s.replace(/[.+#]/g, '\\$&').toLowerCase()}(?![a-z0-9.+#])`, 'i').test(jdLower)
  );
  const matchedKeywords = jdKeywords.filter((s) =>
    new RegExp(`(?<![a-z0-9.#])${s.replace(/[.+#]/g, '\\$&').toLowerCase()}(?![a-z0-9.+#])`, 'i').test(resumeLower)
  );
  const missingKeywords = jdKeywords.filter((s) => !matchedKeywords.includes(s));

  return {
    jdKeywords,
    matchedKeywords,
    missingKeywords,
    matchPercent: jdKeywords.length > 0 ? Math.round((matchedKeywords.length / jdKeywords.length) * 100) : 0,
  };
}

/**
 * POST /api/resume-builder/ai/match-jd
 * body: { jobDescription: string }
 * Compares the current draft against a pasted job description.
 */
export const matchJobDescription = asyncHandler(async (req, res) => {
  const { jobDescription } = req.body;
  if (!jobDescription?.trim() || jobDescription.trim().length < 40) {
    throw ApiError.badRequest('Paste the full job description (at least a few sentences).');
  }

  const doc = await getOwnedDoc(req.user._id);
  const targetRole = req.user.profile?.dreamRole || 'Software Engineer';
  const resumeText = exportToText(doc);

  let result;
  try {
    result = await geminiMatchJobDescription({ jobDescription, resumeText, targetRole });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[JD Match] Gemini unavailable, using local keyword fallback:', err.message);
    result = localMatchJobDescription(jobDescription, resumeText);
  }

  return sendSuccess(res, { data: result });
});

/**
 * POST /api/resume-builder/ai/insert-keywords
 * body: { keywords: string[] }
 * Rewrites the summary to naturally include the given keywords (e.g. the missing
 * ones surfaced by match-jd's "Auto-insert missing keywords" button).
 */
export const insertKeywords = asyncHandler(async (req, res) => {
  const { keywords } = req.body;
  if (!Array.isArray(keywords) || keywords.length === 0) {
    throw ApiError.badRequest('keywords array is required');
  }

  const doc = await getOwnedDoc(req.user._id);
  const targetRole = req.user.profile?.dreamRole || 'Software Engineer';

  const summary = await geminiInsertKeywords({ summary: doc.summary, targetRole, keywords });
  doc.summary = summary;
  await doc.save();
  await refreshAtsScore(doc, targetRole);

  return sendSuccess(res, { data: { summary, resumeBuilder: doc } });
});

// ── Export ────────────────────────────────────────────────────────────────────

/** GET /api/resume-builder/export/pdf */
export const exportPdf = asyncHandler(async (req, res) => {
  const doc = await getOwnedDoc(req.user._id);
  const buffer = await exportToPdf(doc);
  doc.lastExportedAt = new Date();
  await doc.save();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${(doc.contact.name || 'resume').replace(/\s+/g, '_')}.pdf"`);
  res.send(buffer);
});

/** GET /api/resume-builder/export/docx */
export const exportDocx = asyncHandler(async (req, res) => {
  const doc = await getOwnedDoc(req.user._id);
  const buffer = await exportToDocx(doc);
  doc.lastExportedAt = new Date();
  await doc.save();

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="${(doc.contact.name || 'resume').replace(/\s+/g, '_')}.docx"`);
  res.send(buffer);
});

/** GET /api/resume-builder/export/text */
export const exportText = asyncHandler(async (req, res) => {
  const doc = await getOwnedDoc(req.user._id);
  const text = exportToText(doc);
  doc.lastExportedAt = new Date();
  await doc.save();

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(text);
});
