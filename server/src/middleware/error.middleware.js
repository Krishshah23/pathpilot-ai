/**
 * middleware/error.middleware.js — Centralized Express Error Handling
 *
 * HOW EXPRESS ERROR HANDLING WORKS:
 * Express has two types of middleware:
 *   - Regular middleware:    (req, res, next)         — 3 parameters
 *   - Error middleware:      (err, req, res, next)    — 4 parameters (MUST have all 4)
 *
 * Any time a controller or middleware calls next(err) or throws inside asyncHandler,
 * Express skips all remaining regular middleware and jumps straight to the first
 * 4-parameter middleware it finds — that's our `errorHandler` below.
 *
 * MIDDLEWARE ORDER (set up in app.js):
 *   app.use('/api', apiRoutes);      ← business logic
 *   app.use(notFoundHandler);        ← catches any route not matched above → 404
 *   app.use(errorHandler);           ← formats all errors into JSON responses
 *
 * WHY CENTRALIZE ERROR HANDLING?
 * Without a central handler, every controller would need its own try/catch and
 * res.status(xxx).json({...}) logic. With this handler, controllers just throw:
 *   throw ApiError.notFound('User not found');
 * ...and the response is automatically formatted consistently.
 *
 * ERROR TYPES HANDLED:
 *   1. ApiError (our own class)     → use its statusCode + message directly
 *   2. Mongoose duplicate key       → 409 with field name in message
 *   3. Mongoose ValidationError     → 400 with per-field error details
 *   4. Any other Error              → 500 Internal Server Error
 */

import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

/**
 * `notFoundHandler` — 404 handler for routes that don't match any defined route.
 *
 * This must be registered AFTER all route definitions in app.js.
 * If a request reaches this handler, no route matched it — so it's a 404.
 * We call next(err) to pass to errorHandler for consistent JSON formatting.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function notFoundHandler(req, res, next) {
  // Include the method and URL so developers can quickly identify the wrong route
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * `errorHandler` — Central JSON error response formatter.
 *
 * IMPORTANT: Express identifies error middleware by the 4-parameter signature.
 * The `next` parameter must be declared even if unused — removing it breaks Express.
 * The ESLint disable comment suppresses the "unused variable" warning.
 *
 * @param {Error}  err  - The thrown error (ApiError, Mongoose error, or any other Error)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next  - Required by Express (4-param signature)
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Default to 500 and the error's message, or a generic fallback
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details || null;

  // ── Special case: MongoDB duplicate key error ──────────────────────────────
  // Mongoose throws an error with code 11000 when a unique-indexed field already exists.
  // Example: trying to register with an email that's already in the database.
  // We translate this into a user-friendly 409 Conflict with the field name.
  if (err.code === 11000) {
    statusCode = 409;
    // err.keyValue looks like: { email: 'user@example.com' }
    // We extract the field name (email) to tell the user what conflicted.
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `${field} already exists`;
  }

  // ── Special case: Mongoose schema validation error ──────────────────────────
  // When mongoose.save() is called with data that doesn't pass schema validators,
  // it throws a ValidationError with per-field error messages.
  // We convert these into a 400 with a details array.
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    // err.errors is an object: { fieldName: { message: '...', ... }, ... }
    // We extract just the message for each failing field.
    details = Object.values(err.errors).map((e) => e.message);
  }

  // ── Development-only verbose logging ───────────────────────────────────────
  // Log the full error stack to the terminal for 500-level errors in development.
  // In production, you'd send this to an error monitoring service (Sentry, Datadog…).
  // We never send stack traces to the client for security reasons.
  if (statusCode >= 500 && !env.isProd) {
    // eslint-disable-next-line no-console
    console.error('💥', err);
  }

  // Send the standardized JSON error response to the client.
  // The shape mirrors ApiResponse.sendSuccess but with success: false.
  res.status(statusCode).json({
    success: false,
    message,
    // Only include `details` key if there are details to include
    // (avoids "details: null" cluttering clean error responses)
    ...(details ? { details } : {}),
  });
}
