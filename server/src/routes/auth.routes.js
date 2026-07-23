/**
 * routes/auth.routes.js — Authentication Endpoints Router
 *
 * SECURITY FEATURES:
 * Includes rate limiting (`express-rate-limit`) on sensitive routes (login, register, forgot-password)
 * to prevent brute-force attacks.
 *
 * ENDPOINTS:
 * - POST /api/auth/register            → Account registration + verification email
 * - POST /api/auth/login               → Credential authentication → Access token + HttpOnly cookie
 * - POST /api/auth/refresh             → Silent access token rotation via refresh cookie
 * - POST /api/auth/logout              → Cookie clearing
 * - GET  /api/auth/me                  → Authenticated user payload restoration
 * - POST /api/auth/verify-email        → Email confirmation token submission
 * - POST /api/auth/resend-verification → Re-send verification link
 * - POST /api/auth/forgot-password     → Send password reset email
 * - POST /api/auth/reset-password      → Reset password via token
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  refresh,
  logout,
  me,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validators/auth.validators.js';

const router = Router();

// Throttle sensitive authentication endpoints to 20 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Try again later.' },
});

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', protect, me);

router.post('/verify-email', validate(verifyEmailSchema), verifyEmail);
router.post('/resend-verification', protect, resendVerification);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

export default router;
