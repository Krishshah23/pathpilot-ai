import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

/*
  File-upload middleware (Multer). Files are stored on disk under uploads/<kind>/
  and served statically at /uploads. Two kinds are supported:
    - avatar: profile images (jpg/png/webp)
    - resume: PDF / Word documents
*/

const UPLOAD_ROOT = 'uploads';

const KINDS = {
  avatar: {
    dir: 'avatars',
    maxBytes: 2 * 1024 * 1024, // 2 MB
    mimes: ['image/jpeg', 'image/png', 'image/webp'],
    label: 'an image (JPG, PNG, or WebP)',
  },
  resume: {
    dir: 'resumes',
    maxBytes: 5 * 1024 * 1024, // 5 MB
    mimes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    label: 'a PDF or Word document',
  },
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Returns a configured single-file Multer middleware for the given kind.
 * @param {'avatar'|'resume'} kind
 * @param {string} field  form field name
 */
export function upload(kind, field = 'file') {
  const cfg = KINDS[kind];
  if (!cfg) throw new Error(`Unknown upload kind: ${kind}`);

  const dest = path.join(UPLOAD_ROOT, cfg.dir);
  ensureDir(dest);

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const userId = req.user?._id || 'anon';
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      cb(null, `${userId}-${unique}${ext}`);
    },
  });

  const multerInstance = multer({
    storage,
    limits: { fileSize: cfg.maxBytes },
    fileFilter: (_req, file, cb) => {
      if (cfg.mimes.includes(file.mimetype)) return cb(null, true);
      return cb(ApiError.badRequest(`Please upload ${cfg.label}.`));
    },
  }).single(field);

  // Wrap so Multer's own errors (e.g. file too large) become ApiErrors.
  return (req, res, next) => {
    multerInstance(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        const msg =
          err.code === 'LIMIT_FILE_SIZE'
            ? `File is too large. Max ${cfg.maxBytes / (1024 * 1024)} MB.`
            : err.message;
        return next(ApiError.badRequest(msg));
      }
      if (err) return next(err);
      return next();
    });
  };
}

/** Builds the public URL for an uploaded file. */
export function publicUrl(kind, filename) {
  return `/uploads/${KINDS[kind].dir}/${filename}`;
}
