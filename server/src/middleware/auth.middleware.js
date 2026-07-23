/**
 * middleware/auth.middleware.js — JWT Authentication & Role Authorization
 *
 * OVERVIEW:
 * This file exports two Express middleware functions:
 *   1. `protect`   — Verifies the Bearer JWT, loads the user from DB, attaches to req.user
 *   2. `authorize` — Restricts a route to specific roles (used AFTER protect)
 *
 * ── HOW AUTHENTICATION WORKS IN THIS APP ────────────────────────────────────
 *
 * PathPilot uses a dual-token scheme:
 *
 *   ACCESS TOKEN (short-lived, 15m)
 *   - Stored in memory / localStorage on the client
 *   - Sent as "Authorization: Bearer <token>" header on every API request
 *   - `protect` reads and verifies this token
 *
 *   REFRESH TOKEN (long-lived, 7d)
 *   - Stored in an HttpOnly cookie (JavaScript cannot read it)
 *   - Sent automatically by the browser on requests to /api/auth/refresh
 *   - `auth.controller.js → refresh()` rotates it when the access token expires
 *
 * WHY TWO TOKENS?
 * - Access tokens are short so a stolen token expires quickly.
 * - Refresh tokens are long so users don't have to log in every 15 minutes.
 * - The HttpOnly cookie prevents XSS attacks from stealing the refresh token.
 *
 * ── TOKEN FLOW ───────────────────────────────────────────────────────────────
 *
 *   Client                          Server
 *   ──────                          ──────
 *   POST /auth/login ──────────────► auth.controller → signs accessToken + refreshToken
 *                   ◄───────────── accessToken (JSON body) + refreshToken (HttpOnly cookie)
 *
 *   GET /api/resume ──────────────► protect() → verifies accessToken → req.user = user
 *   Authorization: Bearer <token>  resume.controller.js → uses req.user._id
 *
 *   GET /api/auth/refresh ─────────► auth.controller → reads cookie, rotates tokens
 *   (cookie sent automatically)   ◄── new accessToken (JSON body)
 *
 * ── USAGE IN ROUTES ──────────────────────────────────────────────────────────
 *   import { protect, authorize } from '../middleware/auth.middleware.js';
 *
 *   router.get('/resume', protect, getResume);              // Any logged-in user
 *   router.get('/admin/users', protect, authorize('admin'), getUsers); // Admins only
 */

import { User } from '../models/User.js';
import { verifyAccessToken } from '../services/token.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * `protect` — Authentication middleware.
 *
 * Reads the JWT access token from the Authorization header (or ?token= query param
 * as a fallback for scenarios like file download links), verifies it, loads the
 * user from MongoDB, and attaches the full user document to req.user.
 *
 * Throws 401 Unauthorized for any of:
 *   - Missing token
 *   - Invalid/expired token
 *   - User was deleted after the token was issued
 *
 * asyncHandler wraps the async function so any thrown errors automatically
 * reach Express's error handling middleware (errorHandler in error.middleware.js).
 */
export const protect = asyncHandler(async (req, _res, next) => {
  // Extract the Authorization header value (e.g. "Bearer eyJhbGciOiJIUzI1NiJ9...")
  const header = req.headers.authorization || '';

  // The token should be in "Bearer <token>" format — slice off the "Bearer " prefix
  let token = header.startsWith('Bearer ') ? header.slice(7) : null;

  // Fallback: allow token in query string for special cases like direct file downloads
  // e.g. /uploads/resumes/file.pdf?token=eyJ...
  if (!token && req.query.token) {
    token = req.query.token;
  }

  // If no token found anywhere, the user is not authenticated
  if (!token) throw ApiError.unauthorized('Authentication required');

  // Verify the token signature and expiry using JWT secret from env
  let payload;
  try {
    payload = verifyAccessToken(token); // returns { sub: userId, iat, exp }
  } catch {
    // jsonwebtoken throws if the token is expired, malformed, or has wrong signature
    throw ApiError.unauthorized('Invalid or expired token');
  }

  // Load the full user from the database using the subject claim (user ID)
  // This ensures the user still exists — a token for a deleted user is rejected
  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('User no longer exists');

  // Attach the full Mongoose user document to the request object.
  // All subsequent middleware and controllers can access req.user.
  req.user = user;

  // Continue to the next middleware or route handler
  next();
});

/**
 * `authorize` — Role-based access control middleware.
 *
 * Must be used AFTER `protect` (since it reads req.user set by protect).
 *
 * @param {...string} roles - Allowed roles, e.g. authorize('admin') or authorize('admin', 'student')
 *
 * Throws 403 Forbidden if req.user.role is not in the allowed roles list.
 *
 * EXAMPLE:
 *   router.delete('/users/:id', protect, authorize('admin'), deleteUser);
 *   // Only admin users can call DELETE /users/:id
 *   // A student hitting this route gets: { success: false, message: 'You do not have access…' }
 */
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    // roles is an array of allowed roles (e.g. ['admin'])
    // req.user.role is the role stored in the user's MongoDB document
    if (!roles.includes(req.user.role)) {
      // Return 403 — user IS authenticated (protect passed) but doesn't have permission
      return next(ApiError.forbidden('You do not have access to this resource'));
    }

    // User's role is in the allowed list — proceed to the route handler
    return next();
  };
