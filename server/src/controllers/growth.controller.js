import { GrowthPlan } from '../models/GrowthPlan.js';
import { Resume } from '../models/Resume.js';
import { aiService } from '../services/ai.service.js';
import { geminiGenerateGapRoadmap } from '../services/gemini.service.js';
import { collectStudentSkills } from '../services/pathScore.service.js';
import { roadmapToWeeks, preserveCompletion, withProgress } from '../services/growth.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

// GET /api/growth  — the student's active plan (or null)
export const getGrowthPlan = asyncHandler(async (req, res) => {
  const plan = await GrowthPlan.findOne({ user: req.user._id });
  return sendSuccess(res, { data: { plan: withProgress(plan) } });
});

// POST /api/growth/generate  — build/replace the plan, preserving progress
export const generateGrowthPlan = asyncHandler(async (req, res) => {
  const targetRole = req.body.targetRole || req.user.profile?.dreamRole;
  if (!targetRole) throw ApiError.badRequest('Choose a target role to build your roadmap');

  const resume = await Resume.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  const currentSkills = collectStudentSkills(req.user, resume);

  const aiResponse = await aiService.recommendRoadmap({ targetRole, currentSkills });
  const roadmap = aiResponse?.data;
  if (!roadmap) {
    throw new ApiError(
      502,
      aiResponse?.implemented === false
        ? 'The AI service is running outdated code. Please restart the Django service.'
        : 'AI service returned no roadmap'
    );
  }

  const existing = await GrowthPlan.findOne({ user: req.user._id });
  let weeks = preserveCompletion(roadmapToWeeks(roadmap), existing);

  // -- Phase 5 Connection: Inject Gemini Gap Weeks --
  const gaps = resume?.keyGaps || [];
  if (gaps.length > 0) {
    try {
      const gapWeeks = await geminiGenerateGapRoadmap({ gaps, targetRole });
      if (gapWeeks && gapWeeks.length > 0) {
        // Format the gap weeks to match the roadmap structure
        const formattedGapWeeks = gapWeeks.map((w, idx) => ({
          weekNumber: idx + 1,
          topic: w.topic,
          focus: w.focus,
          tasks: w.tasks.map(t => ({
            key: `gap-task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: t.name,
            hours: t.hours,
            completed: false,
            completedAt: null
          }))
        }));
        
        // Shift existing weeks down
        const shiftedExisting = weeks.map(w => ({
          ...w,
          weekNumber: w.weekNumber + formattedGapWeeks.length
        }));

        weeks = [...formattedGapWeeks, ...shiftedExisting];
      }
    } catch (err) {
      console.error('Failed to generate gap roadmap', err);
    }
  }

  const fields = {
    user: req.user._id,
    targetRole: roadmap.targetRole,
    summary: roadmap.summary,
    coverageStart: roadmap.coverage,
    totalWeeks: roadmap.totalWeeks,
    totalTasks: roadmap.totalTasks,
    totalHours: roadmap.totalHours,
    strengths: roadmap.strengths || [],
    weeks,
  };

  const plan = await GrowthPlan.findOneAndUpdate({ user: req.user._id }, fields, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });

  return sendSuccess(res, {
    statusCode: existing ? 200 : 201,
    message: existing ? 'Roadmap updated' : 'Roadmap created',
    data: { plan: withProgress(plan) },
  });
});

// PATCH /api/growth/tasks/:key  — toggle a task's completion
export const toggleTask = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { completed } = req.body;

  const plan = await GrowthPlan.findOne({ user: req.user._id });
  if (!plan) throw ApiError.notFound('No active roadmap. Generate one first.');

  let found = false;
  plan.weeks.forEach((week) =>
    week.tasks.forEach((task) => {
      if (task.key === key) {
        task.completed = typeof completed === 'boolean' ? completed : !task.completed;
        task.completedAt = task.completed ? new Date() : null;
        found = true;
      }
    })
  );

  if (!found) throw ApiError.notFound(`Task "${key}" not found in your roadmap`);

  await plan.save();
  return sendSuccess(res, { message: 'Progress updated', data: { plan: withProgress(plan) } });
});
