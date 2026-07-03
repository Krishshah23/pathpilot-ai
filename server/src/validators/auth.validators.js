import { z } from 'zod';

const email = z.string().email('A valid email is required').toLowerCase();
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password is too long');

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Reset token is required'),
  password,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10, 'Verification token is required'),
});
