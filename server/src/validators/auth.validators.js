/**
 * validators/auth.validators.js — Zod Schemas for Authentication Routes
 *
 * ARCHITECTURAL PURPOSE:
 * Defines strict Zod schemas for user registration, login, email verification,
 * and password recovery endpoints. Validated by `validate` middleware before
 * execution reaches auth controllers.
 */

import { z } from 'zod';

// Shared primitive validation rules
const email = z.string().email('A valid email is required').toLowerCase();
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password is too long');

/** Schema for POST /api/auth/register */
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  email,
  password,
});

/** Schema for POST /api/auth/login */
export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

/** Schema for POST /api/auth/forgot-password */
export const forgotPasswordSchema = z.object({ email });

/** Schema for POST /api/auth/reset-password */
export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Reset token is required'),
  password,
});

/** Schema for POST /api/auth/verify-email */
export const verifyEmailSchema = z.object({
  token: z.string().min(10, 'Verification token is required'),
});
