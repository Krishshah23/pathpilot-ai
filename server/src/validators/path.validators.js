import { z } from 'zod';

export const gapAnalysisSchema = z.object({
  targetRole: z.string().trim().min(2, 'Target role is required').max(80).optional(),
});

export const generateRoadmapSchema = z.object({
  targetRole: z.string().trim().min(2, 'Target role is required').max(80).optional(),
});

export const toggleTaskSchema = z.object({
  completed: z.boolean().optional(),
});

