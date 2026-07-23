/**
 * middleware/validate.middleware.js — Zod Request Body Validation
 *
 * WHY VALIDATE AT THE MIDDLEWARE LAYER?
 * Without input validation, controllers would need to manually check every field:
 *   if (!req.body.email) return res.status(400).json({ error: 'Email required' });
 *   if (!req.body.password) return res.status(400).json({ error: 'Password required' });
 *   // ...multiply by every controller...
 *
 * By centralizing validation in middleware with Zod schemas, controllers receive
 * clean, type-safe data and never have to check for missing/invalid fields themselves.
 *
 * WHY ZOD?
 * Zod is a TypeScript-first schema validation library (works great in plain JS too).
 * It supports:
 *   - Type coercion (string '25' → number 25 with z.coerce.number())
 *   - Chained validations (z.string().email().min(5).max(100))
 *   - Nested objects and arrays
 *   - Custom error messages
 *   - .safeParse() — validates without throwing, returns { success, data, error }
 *
 * HOW IT WORKS:
 * 1. A Zod schema is defined in src/validators/*.js
 * 2. The schema is passed to validate() in the route definition
 * 3. validate() calls schema.safeParse(req.body)
 * 4. If validation fails → 400 with field-level error details
 * 5. If validation passes → req.body is replaced with the parsed (and coerced) value
 *
 * USAGE IN ROUTES:
 *   import { validate } from '../middleware/validate.middleware.js';
 *   import { loginSchema } from '../validators/auth.validators.js';
 *
 *   router.post('/login', validate(loginSchema), login);
 *   // After validate() runs, req.body is guaranteed to have { email, password }
 *   // in the exact types and formats defined by loginSchema.
 *
 * EXAMPLE RESPONSE ON VALIDATION FAILURE:
 *   {
 *     "success": false,
 *     "message": "Validation failed",
 *     "details": [
 *       { "field": "email", "message": "Invalid email" },
 *       { "field": "password", "message": "Password must be at least 8 characters" }
 *     ]
 *   }
 */

import { ApiError } from '../utils/ApiError.js';

/**
 * Returns an Express middleware that validates req.body against a Zod schema.
 *
 * @param {import('zod').ZodSchema} schema  - A Zod schema (e.g. z.object({ email: z.string().email() }))
 * @returns {import('express').RequestHandler}
 */
export const validate = (schema) => (req, res, next) => {
  // .safeParse() validates without throwing.
  // On success: { success: true, data: <parsed and coerced value> }
  // On failure: { success: false, error: <ZodError with .issues array> }
  const result = schema.safeParse(req.body);

  if (!result.success) {
    // Map Zod's issue objects to our simpler { field, message } format.
    // i.path is an array like ['profile', 'dreamRole'] — join joins to 'profile.dreamRole'
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.'),   // Nested field path as dot-notation string
      message: i.message,        // Human-readable error message from Zod
    }));

    // Delegate to the central error handler via next(err)
    return next(ApiError.badRequest('Validation failed', details));
  }

  // Replace req.body with the validated and coerced data.
  // This means:
  //   - Extra fields not in the schema are stripped (security)
  //   - Types are coerced as defined in the schema (e.g. string → number)
  //   - Controllers receive a clean, typed body
  req.body = result.data;

  // Proceed to the next middleware or controller
  return next();
};
