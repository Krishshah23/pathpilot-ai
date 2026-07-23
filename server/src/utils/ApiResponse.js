/**
 * utils/ApiResponse.js — Standard Success Response Helper
 *
 * WHY THIS EXISTS:
 * Without a shared helper, each controller would call res.status(200).json({...})
 * with slightly different shapes. The frontend client (api.js) relies on a
 * consistent envelope: { success: true, message, data }.
 *
 * This function enforces that shape everywhere so the client never has to guess
 * where the payload lives.
 *
 * USAGE:
 *   return sendSuccess(res, { statusCode: 201, message: 'Created', data: resume });
 *
 * CLIENT CONSUMPTION (client/src/lib/api.js):
 *   const { data } = await api.get('/resume');
 *   // data here is the Axios response, so:
 *   const resume = data.data.resume;   // data.data is the { data } field below
 *
 * SHAPE PRODUCED:
 *   HTTP 200 (or custom statusCode)
 *   {
 *     "success": true,
 *     "message": "OK",
 *     "data": { ...payload... }
 *   }
 */

/**
 * Send a consistent JSON success response.
 *
 * @param {import('express').Response} res
 * @param {object} options
 * @param {number} [options.statusCode=200]  HTTP status (200, 201, 204…)
 * @param {string} [options.message='OK']    Human-readable status message
 * @param {any}    [options.data=null]       The actual payload (object, array, or null)
 */
export function sendSuccess(res, { statusCode = 200, message = 'OK', data = null } = {}) {
  // res.status() sets the HTTP status code; .json() serializes to JSON and sets Content-Type.
  // Both are chained because .status() returns the response object.
  return res.status(statusCode).json({ success: true, message, data });
}
