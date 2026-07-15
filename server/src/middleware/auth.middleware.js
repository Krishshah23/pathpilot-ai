import { User } from '../models/User.js';
import { verifyAccessToken } from '../services/token.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Requires a valid access token. Attaches the authenticated user to `req.user`.
 * Accepts `Authorization: Bearer <token>`.
 */
export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  let token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) throw ApiError.unauthorized('Authentication required');

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('User no longer exists');

  req.user = user;
  next();
});

/** Restricts a route to specific roles. Use after `protect`. */
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have access to this resource'));
    }
    return next();
  };
