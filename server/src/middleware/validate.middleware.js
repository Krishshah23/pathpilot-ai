import { ApiError } from '../utils/ApiError.js';

/**
 * Validates `req.body` against a Zod schema. On success, replaces the body with
 * the parsed (and coerced) value so controllers get clean, typed data.
 */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return next(ApiError.badRequest('Validation failed', details));
  }
  req.body = result.data;
  return next();
};
