/**
 * Safe path resolution for the legacy `/uploads/resumes/:filename` route.
 *
 * Legacy resumes were written to disk by multer as
 *   "<24-hex ObjectId>-<timestamp>-<random><.ext>"
 * (see upload.middleware.js). Express decodes `%2F` / `%5C` inside route params,
 * so the raw param must never reach `path.resolve` unchecked — otherwise a value
 * like "<ownId>-x/../../../package.json" escapes the uploads folder and also
 * bypasses the ownership check (which only looks at the prefix).
 */

import path from 'node:path';
import { ApiError } from './ApiError.js';

// Strict whitelist: no separators, no dots except a single trailing extension.
const LEGACY_RESUME_FILENAME = /^([a-f0-9]{24})-\d{1,16}-\d{1,7}(\.[a-z0-9]{1,8})?$/;

/**
 * Validates a legacy resume filename, enforces ownership, and returns the
 * absolute on-disk path guaranteed to live inside `<baseDir>/uploads/resumes`.
 *
 * @param {string} filename - Decoded `req.params.filename`
 * @param {{ _id: unknown, role: string }} user - Authenticated user (req.user)
 * @param {string} [baseDir=process.cwd()] - Server root containing `uploads/`
 * @returns {string} Absolute path to the file
 * @throws {ApiError} 404 for malformed names, 403 for files owned by someone else
 */
export function resolveLegacyResumePath(filename, user, baseDir = process.cwd()) {
  const match = typeof filename === 'string' ? LEGACY_RESUME_FILENAME.exec(filename) : null;
  // 404 (not 400) so malformed probes learn nothing about the route's rules.
  if (!match) throw ApiError.notFound('Resume file not found');

  const ownerId = match[1];
  if (user.role !== 'admin' && String(user._id) !== ownerId) {
    throw ApiError.forbidden('You are not authorized to access this file');
  }

  // Defence in depth: even with the whitelist, confirm the resolved path
  // stays directly inside the resumes directory.
  const resumesDir = path.resolve(baseDir, 'uploads', 'resumes');
  const absPath = path.resolve(resumesDir, filename);
  if (path.dirname(absPath) !== resumesDir) {
    throw ApiError.notFound('Resume file not found');
  }

  return absPath;
}
