/**
 * app.js — Express Application Factory
 *
 * WHY AN APP FACTORY INSTEAD OF DIRECT MODULE?
 * Instead of doing `const app = express()` at module level (which runs immediately
 * on import), we export a `createApp()` function. This pattern:
 *   - Makes the app testable (supertest can call createApp() without opening a port)
 *   - Makes it easy to create multiple isolated app instances in parallel tests
 *   - Keeps index.js (port opening) separate from app.js (request handling setup)
 *
 * MIDDLEWARE ORDER (order matters!):
 * Express processes middleware in the order they are registered with app.use().
 *
 *   1. CORS           — Must be first so OPTIONS preflight requests are handled
 *   2. JSON parsing   — Parse request bodies before any route handler runs
 *   3. Cookie parsing — Parse cookies before auth middleware reads the refresh token
 *   4. Morgan logging — Log requests early so all routes are visible in logs
 *   5. Static files   — Serve avatar images without going through auth
 *   6. Resume access  — Serve resume files WITH auth check (custom handler)
 *   7. API routes     — All /api/* business logic
 *   8. 404 handler    — Catches any request that didn't match a route
 *   9. Error handler  — Catches any error passed to next(err) — MUST be last
 *
 * CORS CONFIGURATION:
 * CORS (Cross-Origin Resource Sharing) controls which browser origins can call this API.
 * We restrict to env.clientUrl (e.g. http://localhost:5173 in dev, https://pathpilot.ai in prod).
 * `credentials: true` is required so the browser sends the HttpOnly refresh-token cookie.
 *
 * RESUME FILE ACCESS CONTROL:
 * Avatar images are served publicly (anyone can view a profile picture).
 * Resume files contain private personal data — they are served via a protected route
 * that verifies:
 *   1. The requester is authenticated (protect middleware)
 *   2. The file belongs to the requester (filename starts with userId) OR is an admin
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';

import path from 'node:path';
import fs from 'node:fs';
import { protect } from './middleware/auth.middleware.js';
import { ApiError } from './utils/ApiError.js';
import { Resume } from './models/Resume.js';

/**
 * Creates and configures the Express application.
 *
 * @returns {import('express').Application} Configured Express app (not yet listening)
 */
export function createApp() {
  const app = express();

  // ── 1. CORS ──────────────────────────────────────────────────────────────────
  // Allow the React client origin to make cross-origin requests.
  // In dev: http://localhost:5173 (Vite dev server)
  // In prod: https://pathpilot.ai (or wherever the client is deployed)
  app.use(
    cors({
      origin: env.clientUrl,   // Only this origin is allowed
      credentials: true,        // Required for cookies (refresh token) to be sent cross-origin
    })
  );

  // ── 2. Body Parsing ──────────────────────────────────────────────────────────
  // Parse JSON request bodies (Content-Type: application/json)
  // Limit to 2MB to prevent large payload attacks
  app.use(express.json({ limit: '2mb' }));

  // Parse URL-encoded bodies (Content-Type: application/x-www-form-urlencoded)
  // extended: true allows nested objects in form data
  app.use(express.urlencoded({ extended: true }));

  // ── 3. Cookie Parsing ────────────────────────────────────────────────────────
  // Parse the Cookie header and populate req.cookies.
  // Required so auth.controller.js can read the HttpOnly refresh token cookie
  // from req.cookies.refreshToken.
  app.use(cookieParser());

  // ── 4. HTTP Request Logging ───────────────────────────────────────────────────
  // Morgan prints each request to the terminal in dev: "GET /api/resume 200 23ms"
  // Disabled in production to avoid log noise (use a proper logging service instead).
  if (!env.isProd) app.use(morgan('dev'));

  // ── 5. Static File Serving — Avatars (Public) ────────────────────────────────
  // Profile avatar images are publicly accessible.
  // Any request to /uploads/avatars/<filename> is served directly from disk.
  // No authentication required — profile pictures are meant to be visible.
  app.use('/uploads/avatars', express.static('uploads/avatars'));

  // ── 6. Protected Resume File Serving ─────────────────────────────────────────
  // Resume files contain sensitive personal data (contact info, experience, education).
  // We serve them with a custom route that enforces ownership:
  //   - Admins can access any resume
  //   - Students can only access their own resume
  // The userId is embedded in the filename (set by upload.middleware.js)
  // to enable fast ownership checks without a DB query.
  app.get('/uploads/resumes/:filename', protect, async (req, res, next) => {
    try {
      const { filename } = req.params;

      // Extract the userId from the filename prefix.
      // Filename format: "<userId>-<timestamp>-<random>.<ext>"
      const fileUserId = filename.split('-')[0];

      // Authorization check: only the file's owner or an admin can access it
      if (req.user.role !== 'admin' && req.user._id.toString() !== fileUserId) {
        throw ApiError.forbidden('You are not authorized to access this file');
      }

      // Build the absolute path to the file on disk
      const absPath = path.resolve(process.cwd(), 'uploads', 'resumes', filename);

      // Check if file exists on disk; if not (e.g. Render free tier ephemeral disk wiped),
      // restore it from the MongoDB base64 backup field.
      if (!fs.existsSync(absPath)) {
        const resumeDoc = await Resume.findOne({ fileUrl: { $regex: filename } }).select('+fileBase64');
        if (resumeDoc && resumeDoc.fileBase64) {
          try {
            const fileBuffer = Buffer.from(resumeDoc.fileBase64, 'base64');
            fs.mkdirSync(path.dirname(absPath), { recursive: true });
            fs.writeFileSync(absPath, fileBuffer);
            return res.contentType(resumeDoc.mimeType || 'application/pdf').send(fileBuffer);
          } catch (restoreErr) {
            // eslint-disable-next-line no-console
            console.error('Failed to restore resume file from MongoDB base64:', restoreErr);
          }
        }
        throw ApiError.notFound('Resume file not found');
      }

      // Send the file to the client (sets appropriate Content-Type based on extension)
      return res.sendFile(absPath);
    } catch (err) {
      // Pass any error to the central error handler
      next(err);
    }
  });

  // ── 7. API Routes ─────────────────────────────────────────────────────────────
  // All business logic routes are mounted under /api.
  // The routes/index.js file mounts all 16 sub-routers.
  app.use('/api', apiRoutes);

  // ── 8. 404 Handler ────────────────────────────────────────────────────────────
  // Any request that fell through all routes without matching is a 404.
  // notFoundHandler calls next(ApiError) to pass to errorHandler.
  app.use(notFoundHandler);

  // ── 9. Central Error Handler ──────────────────────────────────────────────────
  // MUST be registered last. Catches all errors forwarded via next(err).
  // Formats them as consistent JSON error responses.
  app.use(errorHandler);

  return app;
}
