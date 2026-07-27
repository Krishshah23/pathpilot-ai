/**
 * models/ResumeBuilder.js — Resume Builder Document Mongoose Model
 *
 * WHAT THIS MODEL STORES:
 * Each student has at most ONE active resume-in-progress (unique constraint on
 * `user`, same upsert pattern as GrowthPlan.js). Unlike the `Resume` collection
 * (one immutable snapshot per upload, used for AI analysis/scoring), this
 * document is a live, section-by-section editable draft the student builds by
 * hand — with AI assistance — and exports to PDF/DOCX/text.
 *
 * WHY A SEPARATE DOCUMENT FROM `Resume`:
 * `Resume` is the source of truth for AI analysis (health score, role fit,
 * gaps) and is regenerated wholesale on every upload. `ResumeBuilder` is
 * user-authored content the student edits field-by-field over many sessions —
 * conflating the two would mean every re-upload silently overwrites hand-edited
 * work. Mode B ("Import & Edit Mine") COPIES data from the latest `Resume` doc
 * once at creation time; after that the two are independent.
 *
 * SECTION SHAPE:
 * Intentionally denormalized/flat (not referencing Resume's sub-schemas) since
 * the builder's fields are user-editable free text, not AI-parsed extractions.
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

const experienceEntrySchema = new Schema(
  {
    title: { type: String, default: '' },
    company: { type: String, default: '' },
    location: { type: String, default: '' },
    startDate: { type: String, default: '' }, // free text, e.g. 'Jun 2024'
    endDate: { type: String, default: '' },
    current: { type: Boolean, default: false },
    bullets: { type: [String], default: [] },
  },
  { _id: false }
);

const projectEntrySchema = new Schema(
  {
    title: { type: String, default: '' },
    link: { type: String, default: '' },
    bullets: { type: [String], default: [] },
  },
  { _id: false }
);

const educationEntrySchema = new Schema(
  {
    degree: { type: String, default: '' },
    institution: { type: String, default: '' },
    location: { type: String, default: '' },
    startDate: { type: String, default: '' },
    endDate: { type: String, default: '' },
    gpa: { type: String, default: '' },
  },
  { _id: false }
);

const resumeBuilderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },

    // How this document was first populated — informational only, doesn't affect editing.
    sourceMode: { type: String, enum: ['scratch', 'import', 'migrate'], default: 'scratch' },

    // Which live-preview template to render — see client/src/components/resumeBuilder/templates/
    template: { type: String, enum: ['minimal', 'modern', 'classic'], default: 'minimal' },

    contact: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      location: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      github: { type: String, default: '' },
      website: { type: String, default: '' },
    },

    summary: { type: String, default: '' },
    experience: { type: [experienceEntrySchema], default: [] },
    skills: { type: [String], default: [] },
    projects: { type: [projectEntrySchema], default: [] },
    education: { type: [educationEntrySchema], default: [] },

    // Cached ATS heuristic score — recomputed by resumeBuilderAts.service.js whenever
    // the document is fetched or edited (cheap, deterministic — not an AI call).
    atsScore: {
      overall: { type: Number, default: 0 },
      keywordMatchPercent: { type: Number, default: 0 },
      readability: { type: Number, default: 0 },
      bulletStrength: { type: Number, default: 0 },
      matchedKeywords: { type: [String], default: [] },
      missingKeywords: { type: [String], default: [] },
      suggestions: { type: [String], default: [] },
      computedAt: { type: Date, default: null },
    },

    lastExportedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const ResumeBuilder = mongoose.model('ResumeBuilder', resumeBuilderSchema);
