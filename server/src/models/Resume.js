/**
 * models/Resume.js — Resume Analysis Mongoose Model
 *
 * WHAT THIS MODEL STORES:
 * Every resume upload creates a NEW document in the `resumes` collection.
 * This means resume history is preserved — the UI displays the most recent one
 * (.sort({ createdAt: -1 }).limit(1)) but older analyses remain queryable.
 *
 * DATA PIPELINE (how a document is populated):
 * 1. Multer saves the file to disk → req.file.path
 * 2. resumeText.service.js extracts raw text (PDF/DOCX)
 * 3. Django ml/views.py → parse_resume() adds: skills, education, projects,
 *    experience, certifications, contact, healthScore, healthBreakdown, suggestions
 * 4. resumeRedFlags.js adds: redFlags[]
 * 5. gemini.service.js → geminiAnalyzeResume() adds: roleFitScore, keyGaps,
 *    strengthAreas, atsKeywordsMissing, aiRecommendations, nextStepPriority
 * 6. gemini.service.js → geminiExplainScore() adds: aiNarrative
 * 7. Resume.create({...}) persists the full document
 *
 * SUB-SCHEMAS:
 * Mongoose sub-schemas ({_id: false}) are used for structured embedded data:
 * - healthFactorSchema: one entry per health dimension (10 factors)
 * - projectSchema: one entry per extracted project from the resume
 *
 * IMPORTANT: aiNarrative INVALIDATION
 * aiNarrative is generated against the user's dreamRole at upload time.
 * If dreamRole changes, aiNarrative MUST be cleared (set to '') to prevent
 * the dashboard showing a stale narrative about the wrong role.
 * See profile.controller.js and pathpilot_onboarding.md Phase 8 for details.
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * One health factor entry in the resume health breakdown.
 * There are 10 health factors evaluated by Django's resume_parser.py:
 *   contact, github, linkedin, skills, projects, education, experience,
 *   certifications, length, quantification
 */
const healthFactorSchema = new Schema(
  {
    // Human-readable label shown in the UI (e.g. 'GitHub Profile')
    label: String,

    // Points earned for this factor (e.g. 8)
    score: Number,

    // Maximum possible points (e.g. 10)
    max: Number,

    // Visual status for color-coding in the UI:
    // 'good' = green (high score), 'warn' = amber (medium), 'bad' = red (low)
    status: { type: String, enum: ['good', 'warn', 'bad'] },

    // Actionable suggestion for improving this factor
    // (e.g. 'Add your GitHub profile URL to your resume')
    tip: { type: String, default: '' },
  },
  { _id: false } // Embedded — no separate _id needed
);

/**
 * One extracted project from the resume.
 * Django's resume_parser.py detects project section headers and segments them.
 */
const projectSchema = new Schema(
  {
    // Project name/title (e.g. 'E-Commerce Platform')
    title: String,

    // Project description (e.g. 'Built with React, Node.js, and MongoDB...')
    description: { type: String, default: '' },
  },
  { _id: false } // Embedded — no separate _id needed
);

/**
 * Main resume schema — the `resumes` collection in MongoDB.
 *
 * INDEXING STRATEGY:
 * Only `user` is indexed because all queries are:
 *   Resume.find({ user: userId }).sort({ createdAt: -1 })
 * The sort takes advantage of the built-in _id (insertion order) for createdAt desc.
 */
const resumeSchema = new Schema(
  {
    // Reference to the user who uploaded this resume (MongoDB ObjectId)
    // index: true creates a B-tree index so queries by user are fast
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // ── File metadata ──────────────────────────────────────────────────────────

    // URL path to the saved file (e.g. '/uploads/resumes/64a1-172113-489.pdf')
    // Used to display a download link and to re-read the file if needed
    fileUrl: { type: String, required: true },

    // Base64 encoded file content stored directly in MongoDB as a backup
    // Ensures resume files persist permanently even if Render's ephemeral disk resets
    fileBase64: { type: String, default: '' },

    // MIME type of the uploaded file
    mimeType: { type: String, default: 'application/pdf' },

    // Original filename from the user's computer (e.g. 'Krish_Resume_2024.pdf')
    // Stored for display purposes only — the saved filename is generated and unique
    originalName: { type: String, default: '' },

    // ── Extracted structure (from Django's resume_parser.py) ──────────────────

    // List of skills found in the resume (e.g. ['Python', 'React', 'Node.js'])
    // Normalized to canonical form via ml/data/skills.py SKILL_ALIASES
    skills: { type: [String], default: [] },

    // Education entries extracted (e.g. ['B.Tech CSE, IIT Delhi, 2022-2026'])
    education: { type: [String], default: [] },

    // Structured project entries with title + description
    projects: { type: [projectSchema], default: [] },

    // Work experience / internship entries
    experience: { type: [String], default: [] },

    // Certifications mentioned in the resume
    certifications: { type: [String], default: [] },

    // Contact information extracted from the resume
    contact: {
      email: { type: String, default: '' },       // Email address from resume
      phone: { type: String, default: '' },       // Phone number
      linkedin: { type: String, default: '' },    // LinkedIn profile URL
      github: { type: String, default: '' },      // GitHub profile URL
    },

    // ── Resume Health Score (from Django) ─────────────────────────────────────

    // Overall health score (0–100) computed as a weighted average of 10 factors
    healthScore: { type: Number, default: 0 },

    // Breakdown of each of the 10 health factors with individual scores and tips
    healthBreakdown: { type: [healthFactorSchema], default: [] },

    // ATS improvement suggestions generated by Django's parser
    // (e.g. 'Add more quantified achievements with metrics')
    suggestions: { type: [String], default: [] },

    // ── Red Flags (from resumeRedFlags.js) ────────────────────────────────────
    // Heuristic issues detected that could hurt the student's chances
    // (e.g. missing GitHub, no quantified results, too short)
    redFlags: {
      type: [
        {
          key: String,         // Unique identifier (e.g. 'no_github')
          label: String,       // Short label shown in the UI (e.g. 'No GitHub Profile')
          description: String, // Explanation of why this is a problem
          fix: String,         // What the student should do to fix it
          severity: {
            type: String,
            enum: ['critical', 'warning'], // 'critical' = red, 'warning' = amber
          },
        },
      ],
      default: [],
    },

    // Total word count of extracted text — used to detect very short/unreadable resumes
    wordCount: { type: Number, default: 0 },

    // True if the word count is below a threshold — triggers the Gemini fallback parser
    // Django's regex parser struggles with complex two-column PDFs; Gemini handles these
    lowText: { type: Boolean, default: false },

    // Field names (e.g. 'skills', 'experience') the post-parse Gemini sanity check
    // flagged as uncertain — usually from multi-column layouts, tables, or skills
    // listed inline within job descriptions. The UI shows a "please verify" hint
    // next to these sections. See geminiValidateParsedResume() in gemini.service.js.
    lowConfidenceFields: { type: [String], default: [] },

    // ── Gemini AI Intelligence Layer ──────────────────────────────────────────
    // These fields are populated AFTER Django parsing by gemini.service.js.
    // They represent role-specific intelligence (comparing the resume to dreamRole).

    // How well the resume fits the target role (0–100).
    // Calculated by Gemini comparing skills + experience against role requirements.
    roleFitScore: { type: Number, default: null },

    // Skills required for the target role that are missing from this resume
    // Used in the Gap Analysis panel and to generate the learning roadmap
    keyGaps: { type: [String], default: [] },

    // Areas where the student's resume is strong relative to the target role
    strengthAreas: { type: [String], default: [] },

    // Keywords common in job postings for the target role that are missing from the resume
    // ATS systems look for these keywords; adding them improves pass rates
    atsKeywordsMissing: { type: [String], default: [] },

    // Gemini's prioritized list of actionable next steps
    aiRecommendations: { type: [String], default: [] },

    // The single most important thing the student should focus on next
    nextStepPriority: { type: String, default: '' },

    // Long-form coaching narrative generated by geminiExplainScore().
    // Pre-generated at upload time and cached here to avoid re-calling Gemini on every
    // dashboard load (Gemini calls are slow and cost API credits).
    //
    // ⚠️  IMPORTANT: Clear this (set to '') whenever dreamRole changes.
    // The narrative is role-specific — a stale narrative is worse than no narrative.
    aiNarrative: { type: String, default: '' },
  },
  { timestamps: true } // Adds createdAt and updatedAt
);

export const Resume = mongoose.model('Resume', resumeSchema);
