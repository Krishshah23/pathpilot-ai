import { z } from 'zod';

// Shared profile fields. All optional on update; onboarding requires a subset.
const skills = z
  .array(z.string().trim().min(1).max(40))
  .max(50, 'Too many skills (max 50)')
  .optional();

export const onboardingSchema = z.object({
  dreamRole: z.string().trim().min(2, 'Please pick a target role').max(80),
  skills: z.array(z.string().trim().min(1).max(40)).max(50).default([]),
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    college: z.string().trim().max(120).optional(),
    branch: z.string().trim().max(80).optional(),
    semester: z.coerce.number().int().min(1).max(12).nullable().optional(),
    dreamRole: z.string().trim().max(80).optional(),
    skills,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'No fields to update',
  });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(72),
});
