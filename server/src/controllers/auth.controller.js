/**
 * controllers/auth.controller.js — Authentication Controller
 *
 * ARCHITECTURAL ROLE:
 * Handles user account creation, credential verification, session issuance via dual JWTs,
 * email token verification, and password resets.
 *
 * DUAL-TOKEN SESSION STRATEGY:
 * - Access Token: short-lived (15m), returned in JSON response payload.
 * - Refresh Token: long-lived (7d), set in an HttpOnly cookie (`ppRefresh`).
 *
 * FIRE-AND-FORGET EMAIL DELIVERIES:
 * Email dispatch errors (e.g. SMTP failures or provider sandbox restrictions) are caught
 * and logged to the server console without throwing exceptions, ensuring user registration
 * and password reset flows complete successfully even when email delivery fails.
 */

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

// Cookie key used for refresh tokens
const REFRESH_COOKIE = 'ppRefresh';

// Cookie options ensuring XSS and CSRF security across environments
const refreshCookieOptions = {
  httpOnly: true, // Prevents client-side JavaScript access (mitigates XSS token theft)
  secure: env.isProd, // Enforces HTTPS in production
  sameSite: env.isProd ? 'none' : 'lax', // Supports cross-site API usage in production
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  path: '/api/auth', // Restricts cookie transmission to authentication endpoints only
};

/**
 * Issues signed access and refresh tokens for a user session.
 * @param {import('express').Response} res
 * @param {object} user - User document
 * @returns {string} Access token string
 */
export function issueSession(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
  return accessToken;
}

/**
 * POST /api/auth/register
 * Registers a new student account, sends a verification email, and issues a initial session.
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const exists = await User.findOne({ email });
  if (exists) throw ApiError.conflict('An account with this email already exists');

  const user = await User.create({ name, email, password });

  // Fire-and-forget email delivery
  try {
    const verifyToken = signPurposeToken(user._id, 'verify-email', '24h');
    await sendVerificationEmail(user, verifyToken);
  } catch (emailErr) {
    // eslint-disable-next-line no-console
    console.warn('[register] Verification email failed to send:', emailErr?.message ?? emailErr);
  }

  const accessToken = issueSession(res, user);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Account created successfully! A verification email will be sent shortly.',
    data: { user: user.toSafeJSON(), accessToken },
  });
});

/**
 * POST /api/auth/login
 * Validates user credentials, updates last login timestamp, and issues new session tokens.
 */
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

/**
 * POST /api/auth/refresh
 * Rotates access token using valid refresh cookie.
 */
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

/**
 * POST /api/auth/logout
 * Clears the refresh token HttpOnly cookie.
 */
export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions, maxAge: undefined });
  return sendSuccess(res, { message: 'Logged out' });
});

/**
 * GET /api/auth/me
 * Returns current authenticated user details.
 */
export const me = asyncHandler(async (req, res) => {
  return sendSuccess(res, { data: { user: req.user.toSafeJSON() } });
});

/**
 * POST /api/auth/verify-email
 * Marks candidate email as verified using token from link.
 */
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

/**
 * POST /api/auth/forgot-password
 * Generates password reset token and emails link.
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Always return success message to prevent user enumeration attacks
  if (user) {
    try {
      const resetToken = signPurposeToken(user._id, 'reset-password', '1h');
      await sendPasswordResetEmail(user, resetToken);
    } catch (emailErr) {
      // eslint-disable-next-line no-console
      console.warn('[forgotPassword] Reset email failed to send:', emailErr?.message ?? emailErr);
    }
  }

  return sendSuccess(res, {
    message: 'If an account exists for that email, a reset link has been sent.',
  });
});

/**
 * POST /api/auth/reset-password
 * Resets user password using verified reset token.
 */
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

  user.password = password; // Hashed by User model pre-save hook
  await user.save();

  return sendSuccess(res, { message: 'Password reset successfully. You can now log in.' });
});

/**
 * POST /api/auth/resend-verification
 * Re-issues verification token and dispatches email link.
 */
export const resendVerification = asyncHandler(async (req, res) => {
  const user = req.user;
  if (user.isEmailVerified) {
    throw ApiError.badRequest('Email is already verified');
  }

  const verifyToken = signPurposeToken(user._id, 'verify-email', '24h');
  let sandboxMode = false;

  try {
    await sendVerificationEmail(user, verifyToken);
  } catch (emailErr) {
    // eslint-disable-next-line no-console
    console.warn('[resendVerification] Email delivery failed, logging to console:', emailErr.message || emailErr);

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const link = `${clientUrl}/verify-email?token=${verifyToken}`;
    // eslint-disable-next-line no-console
    console.log('\n📧 [SANDBOX DEV FALLBACK] Verification Link logged below:');
    // eslint-disable-next-line no-console
    console.log(`🔗 Link: ${link}\n`);

    sandboxMode = true;
  }

  return sendSuccess(res, {
    message: sandboxMode
      ? 'Resend sandbox limit reached. Verification link logged to server console.'
      : 'Verification email resent successfully',
    data: { sandbox: sandboxMode },
  });
});
