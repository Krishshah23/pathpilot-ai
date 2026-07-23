/**
 * validators/path.validators.js — Zod Schemas for Skill Gap & Growth Plan Routes
 *
 * ARCHITECTURAL PURPOSE:
 * Validates target role payloads and task toggle flags for growth roadmap endpoints.
 */

import { z } from 'zod';

/** Schema for POST /api/gap/analyze */
export const gapAnalysisSchema = z.object({
  targetRole: z.string().trim().min(2, 'Target role is required').max(80).optional(),
});

/** Schema for POST /api/growth/generate */
export const generateRoadmapSchema = z.object({
  targetRole: z.string().trim().min(2, 'Target role is required').max(80).optional(),
});

/** Schema for PATCH /api/growth/tasks/:key */
export const toggleTaskSchema = z.object({
  completed: z.boolean().optional(),
});
