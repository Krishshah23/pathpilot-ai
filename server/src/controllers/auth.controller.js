import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  signPurposeToken,
  verifyPurposeToken,
} from '../services/token.service.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.service.js';
import { env } from '../config/env.js';

const REFRESH_COOKIE = 'ppRefresh';

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: env.isProd ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/auth',
};

/** Issues an access token and sets the refresh token as an httpOnly cookie. */
function issueSession(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
  return accessToken;
}

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const exists = await User.findOne({ email });
  if (exists) throw ApiError.conflict('An account with this email already exists');

  const user = await User.create({ name, email, password });

  const verifyToken = signPurposeToken(user._id, 'verify-email', '24h');
  await sendVerificationEmail(user, verifyToken);

  const accessToken = issueSession(res, user);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Account created. Check your email to verify your account.',
    data: { user: user.toSafeJSON(), accessToken },
  });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = issueSession(res, user);
  return sendSuccess(res, {
    message: 'Logged in successfully',
    data: { user: user.toSafeJSON(), accessToken },
  });
});

// POST /api/auth/refresh  — rotates the access token using the refresh cookie
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized('No refresh token');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('User no longer exists');

  const accessToken = signAccessToken(user);
  return sendSuccess(res, { message: 'Token refreshed', data: { accessToken } });
});

// POST /api/auth/logout
export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions, maxAge: undefined });
  return sendSuccess(res, { message: 'Logged out' });
});

// GET /api/auth/me
export const me = asyncHandler(async (req, res) => {
  return sendSuccess(res, { data: { user: req.user.toSafeJSON() } });
});

// POST /api/auth/verify-email
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  let payload;
  try {
    payload = verifyPurposeToken(token, 'verify-email');
  } catch {
    throw ApiError.badRequest('Invalid or expired verification link');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.notFound('User not found');

  if (!user.isEmailVerified) {
    user.isEmailVerified = true;
    await user.save();
  }

  return sendSuccess(res, {
    message: 'Email verified successfully',
    data: { user: user.toSafeJSON() },
  });
});

// POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Always respond with success to avoid leaking which emails are registered.
  if (user) {
    const resetToken = signPurposeToken(user._id, 'reset-password', '1h');
    await sendPasswordResetEmail(user, resetToken);
  }

  return sendSuccess(res, {
    message: 'If an account exists for that email, a reset link has been sent.',
  });
});

// POST /api/auth/reset-password
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  let payload;
  try {
    payload = verifyPurposeToken(token, 'reset-password');
  } catch {
    throw ApiError.badRequest('Invalid or expired reset link');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.notFound('User not found');

  user.password = password; // hashed by pre-save hook
  await user.save();

  return sendSuccess(res, { message: 'Password reset successfully. You can now log in.' });
});
