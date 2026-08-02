/**
 * middleware/upload.middleware.js — File Upload Handling via Multer
 *
 * WHAT IS MULTER?
 * Multer is an Express middleware for handling multipart/form-data — the encoding
 * type used when browsers submit file inputs. Without Multer, uploaded files are
 * unavailable in req.body or req.file.
 *
 * HOW FILES ARE STORED (differs by kind — this matters a lot):
 *   - 'avatar': saved to disk under uploads/avatars/<userId>-<timestamp>-<random>.jpg.
 *     Small, public, low-stakes if lost on a Render redeploy — not worth the extra
 *     complexity of cloud storage.
 *   - 'resume': kept in memory only (multer.memoryStorage()), never touches disk.
 *     Render's free-tier disk is ephemeral (wiped on every redeploy/restart/spin-down),
 *     so resume controllers persist req.file.buffer to MongoDB GridFS themselves
 *     (see config/gridfs.js) — this middleware's job ends at handing back the buffer.
 *
 * HOW FILES ARE SERVED:
 *   - Avatars: publicly accessible at /uploads/avatars/* (set up in app.js)
 *   - Resumes: access-controlled, streamed from GridFS at /api/resume/file/:fileId
 *     (see resume.controller.js's serveResumeFile + resume.routes.js)
 *
 * TWO UPLOAD KINDS:
 *   - 'avatar': profile images (JPG, PNG, WebP) up to 2 MB
 *   - 'resume': documents (PDF, Word) up to 5 MB
 *
 * USAGE IN ROUTES:
 *   import { upload } from '../middleware/upload.middleware.js';
 *   router.post('/resume/analyze', protect, upload('resume', 'file'), analyzeResume);
 *   router.post('/profile/avatar', protect, upload('avatar', 'file'), uploadAvatar);
 *
 *   After middleware runs, for 'avatar' (disk storage):
 *   - req.file.path         → absolute disk path to the saved file
 *   - req.file.filename     → generated on-disk filename
 *   For 'resume' (memory storage):
 *   - req.file.buffer       → the raw file content as a Buffer (nothing written to disk)
 *   Common to both:
 *   - req.file.originalname → original filename from the browser
 *   - req.file.mimetype     → MIME type for further validation
 *   - req.file.size         → file size in bytes
 */

import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

// Root directory where all uploaded files are stored.
// Relative to the process working directory (the server/ folder when running npm run dev).
const UPLOAD_ROOT = 'uploads';

/**
 * Configuration for each upload kind.
 * Adding a new file type just means adding a new entry here — no other changes needed.
 */
const KINDS = {
  avatar: {
    dir: 'avatars',               // Subdirectory inside UPLOAD_ROOT
    maxBytes: 2 * 1024 * 1024,   // 2 MB size limit
    mimes: ['image/jpeg', 'image/png', 'image/webp'], // Allowed MIME types
    label: 'an image (JPG, PNG, or WebP)', // Human-readable for error messages
  },
  resume: {
    dir: 'resumes',
    maxBytes: 5 * 1024 * 1024,   // 5 MB — PDFs and Word docs can be large
    mimes: [
      'application/pdf',          // Standard PDF
      'application/msword',       // .doc (older Word format)
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    ],
    label: 'a PDF or Word document',
  },
};

/**
 * Creates the upload directory if it doesn't already exist.
 * Called before setting up the Multer storage engine.
 * { recursive: true } means it creates parent dirs too and doesn't error if dir exists.
 */
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Returns a configured Multer middleware for the specified upload kind.
 *
 * @param {'avatar'|'resume'} kind  - Which type of file this upload handles
 * @param {string} field            - The form field name (e.g. 'file', 'avatar')
 * @returns {import('express').RequestHandler} - Express middleware
 */
export function upload(kind, field = 'file') {
  const cfg = KINDS[kind];
  if (!cfg) throw new Error(`Unknown upload kind: ${kind}`);

  /**
   * Resumes: MemoryStorage — keeps the file in RAM as req.file.buffer, nothing
   * written to disk. Necessary because Render's free-tier disk is ephemeral;
   * the buffer is persisted to MongoDB GridFS by the controller instead.
   *
   * Avatars: DiskStorage — small, public images where the ephemeral-disk
   * tradeoff isn't worth the extra complexity of cloud storage.
   */
  let storage;
  if (kind === 'resume') {
    storage = multer.memoryStorage();
  } else {
    // Full path to the destination directory (e.g. 'uploads/avatars')
    const dest = path.join(UPLOAD_ROOT, cfg.dir);
    ensureDir(dest); // create the directory now (before any requests come in)

    storage = multer.diskStorage({
      // destination: called for each upload to determine the save directory
      destination: (_req, _file, cb) => cb(null, dest),

      // filename: generates a unique filename to prevent collisions and overwriting
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase(); // e.g. '.jpg'
        const userId = req.user?._id || 'anon'; // uses authenticated user ID from protect()
        // timestamp + random ensures uniqueness even for concurrent uploads
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        // Final filename: e.g. "64a1f2c3d4e5f6a7b8c9-1721234567890-483920.jpg"
        cb(null, `${userId}-${unique}${ext}`);
      },
    });
  }

  /**
   * Create the Multer upload instance with:
   * - storage: disk storage configured above
   * - limits: file size limit from the kind config
   * - fileFilter: MIME type whitelist (rejects invalid file types before saving)
   * - .single(field): process only one file from the specified form field name
   */
  const multerInstance = multer({
    storage,
    limits: { fileSize: cfg.maxBytes },
    fileFilter: (_req, file, cb) => {
      if (cfg.mimes.includes(file.mimetype)) {
        // File type is allowed — cb(null, true) tells Multer to accept it
        return cb(null, true);
      }
      // File type is not in the whitelist — reject with an ApiError
      // cb(error) tells Multer to stop and forward this error to Express
      return cb(ApiError.badRequest(`Please upload ${cfg.label}.`));
    },
  }).single(field); // Only accept one file per request from the given field name

  /**
   * Return a wrapper around multerInstance that translates Multer-specific errors
   * (MulterError) into our ApiError format.
   *
   * Without this wrapper, Multer errors wouldn't match our JSON error shape.
   */
  return (req, res, next) => {
    multerInstance(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        // Multer's own errors (file too large, field name wrong, etc.)
        const msg =
          err.code === 'LIMIT_FILE_SIZE'
            ? `File is too large. Max ${cfg.maxBytes / (1024 * 1024)} MB.`
            : err.message;
        return next(ApiError.badRequest(msg));
      }

      // Non-Multer error (e.g. our ApiError from fileFilter) — forward as-is
      if (err) return next(err);

      // No error — file is saved to disk; req.file is populated
      return next();
    });
  };
}

/**
 * Generates the public URL path for a disk-stored file (avatars only —
 * resumes use memory storage and are addressed by GridFS id instead;
 * see resume.controller.js's serveResumeFile for that URL scheme).
 *
 * @param {'avatar'} kind      - Upload kind
 * @param {string}   filename  - The generated filename (from multer storage.filename)
 * @returns {string} - e.g. '/uploads/avatars/64a1f2c3...-1721234567890.jpg'
 */
export function publicUrl(kind, filename) {
  return `/uploads/${KINDS[kind].dir}/${filename}`;
}
