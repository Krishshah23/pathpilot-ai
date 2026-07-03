/**
 * Standard success envelope so the frontend can rely on a consistent shape:
 *   { success: true, message, data }
 */
export function sendSuccess(res, { statusCode = 200, message = 'OK', data = null } = {}) {
  return res.status(statusCode).json({ success: true, message, data });
}
