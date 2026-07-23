/**
 * utils/ApiError.js — Custom HTTP Error Class
 *
 * WHY THIS EXISTS:
 * Express has no built-in concept of "this is a 404" vs "this is a 500".
 * By throwing ApiError instead of a plain Error, controllers can signal exactly
 * what HTTP status and message the client should receive without any conditional
 * logic in the error handler.
 *
 * HOW IT WORKS:
 *   throw ApiError.notFound('User not found');
 *   → caught by asyncHandler → forwarded to errorHandler middleware
 *   → errorHandler reads err.statusCode and err.message → sends JSON response
 *
 * THE isOperational FLAG:
 * Distinguishes expected operational errors (user did something wrong — 400, 401, 404)
 * from unexpected programming bugs (null reference, DB outage — 500).
 * The error handler could log only non-operational errors to an alerting service.
 *
 * USAGE IN CONTROLLERS:
 *   import { ApiError } from '../utils/ApiError.js';
 *   if (!user) throw ApiError.notFound('User not found');
 *   if (wrong) throw ApiError.badRequest('Email already taken', { field: 'email' });
 */

export class ApiError extends Error {
  /**
   * @param {number} statusCode  - HTTP status code (400, 401, 403, 404, 409, 500…)
   * @param {string} message     - Human-readable error description sent to the client
   * @param {any}    details     - Optional extra info (e.g. Zod validation issue list)
   */
  constructor(statusCode, message, details = null) {
    // Call Error constructor so that this.message and this.stack are set correctly
    super(message);

    // The HTTP status code that the error middleware will use to set res.status()
    this.statusCode = statusCode;

    // Optional extra data (e.g. array of Zod field errors for 400 responses)
    this.details = details;

    // Mark as an expected/handled error — not a programming bug.
    // Lets the error handler decide whether to log it loudly or silently.
    this.isOperational = true;

    // V8 (Node.js) optimization: removes this constructor from the stack trace
    // so the trace points to where the error was thrown, not where ApiError was created.
    Error.captureStackTrace(this, this.constructor);
  }

  // ── Static factory methods ──────────────────────────────────────────────────
  // These exist so controllers can write concise one-liners instead of
  // "new ApiError(400, …)" every time.

  /**
   * 400 Bad Request — the client sent invalid data.
   * @param {string} msg    - Readable reason (e.g. 'Validation failed')
   * @param {any}    details - Optional field-level breakdown (e.g. Zod issues)
   */
  static badRequest(msg = 'Bad request', details) {
    return new ApiError(400, msg, details);
  }

  /**
   * 401 Unauthorized — no valid token provided.
   * Note: "Unauthorized" is a misleading HTTP name; it actually means "unauthenticated".
   */
  static unauthorized(msg = 'Unauthorized') {
    return new ApiError(401, msg);
  }

  /**
   * 403 Forbidden — token is valid but the user lacks the required role/permission.
   * Distinct from 401: the user IS authenticated, they just aren't allowed to do this.
   */
  static forbidden(msg = 'Forbidden') {
    return new ApiError(403, msg);
  }

  /**
   * 404 Not Found — the requested resource does not exist.
   * Also used for "resource exists but belongs to a different user" to avoid
   * leaking whether a resource exists at all.
   */
  static notFound(msg = 'Not found') {
    return new ApiError(404, msg);
  }

  /**
   * 409 Conflict — the request conflicts with current state (e.g. duplicate email).
   */
  static conflict(msg = 'Conflict') {
    return new ApiError(409, msg);
  }
}
