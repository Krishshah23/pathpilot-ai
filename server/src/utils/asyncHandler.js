/**
 * utils/asyncHandler.js — Async Route Handler Wrapper
 *
 * WHY THIS EXISTS:
 * Express was designed before async/await existed. If you write:
 *
 *   app.get('/users', async (req, res) => {
 *     const user = await User.findById(req.params.id); // if this throws...
 *     res.json(user);
 *   });
 *
 * ...and User.findById() throws an error, Express doesn't automatically forward
 * that error to the next error-handling middleware. The server crashes or hangs.
 *
 * To fix this without async/await support, Express docs suggest:
 *   app.get('/users', (req, res, next) => {
 *     User.findById(req.params.id).then(user => res.json(user)).catch(next);
 *   });
 *
 * asyncHandler does this automatically so controllers can be written as clean
 * async functions without any try/catch boilerplate:
 *
 *   export const getUser = asyncHandler(async (req, res) => {
 *     const user = await User.findById(req.params.id);
 *     if (!user) throw ApiError.notFound('User not found'); // auto-forwarded to next()
 *     sendSuccess(res, { data: { user } });
 *   });
 *
 * HOW IT WORKS:
 * Returns a standard Express (req, res, next) function that calls the async `fn`.
 * Promise.resolve() wraps `fn` so it works whether `fn` is async or sync.
 * If the promise rejects, .catch(next) calls next() with the error, which triggers
 * Express's error handling middleware chain (errorHandler in error.middleware.js).
 *
 * @param {Function} fn  - An async (req, res, next) route handler function
 * @returns {Function}   - A regular Express (req, res, next) function
 */
export const asyncHandler = (fn) => (req, res, next) =>
  // Promise.resolve() turns sync functions into promises too,
  // so asyncHandler works with both async and regular functions.
  Promise.resolve(fn(req, res, next)).catch(next);
  // .catch(next) is shorthand for .catch((err) => next(err))
  // It passes the error to Express's next error-handling middleware.
