/**
 * controllers/growth.controller.js — Learning Roadmap Controller
 *
 * ARCHITECTURAL ROLE:
 * Generates and manages the candidate's week-by-week learning roadmap (`GrowthPlan`):
 * 1. Fetches baseline roadmap from Django ML service (`aiService.recommendRoadmap`).
 * 2. Preserves completion state across regenerations by matching task `key` strings (`preserveCompletion`).
 * 3. Injects Gemini AI gap weeks when the roadmap target role matches the candidate's dreamRole (`geminiGenerateGapRoadmap`).
 * 4. Provides task toggle endpoint (`toggleTask`) updating completed status and timestamps.
 */

import { GrowthPlan } from '../models/GrowthPlan.js';
import { Resume } from '../models/Resume.js';
import { aiService } from '../services/ai.service.js';
import { geminiGenerateGapRoadmap, geminiGenerateRoadmap } from '../services/gemini.service.js';
import { collectStudentSkills } from '../services/pathScore.service.js';
import { roadmapToWeeks, preserveCompletion, withProgress } from '../services/growth.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

// ── Role skill maps for local fallback ──────────────────────────────────────
const ROLE_SKILL_MAP = {
  'Full Stack Developer': [
    { skill: 'HTML & CSS', hours: 8, priority: 'core' },
    { skill: 'JavaScript', hours: 12, priority: 'core' },
    { skill: 'React', hours: 14, priority: 'core' },
    { skill: 'Node.js', hours: 12, priority: 'core' },
    { skill: 'REST APIs', hours: 8, priority: 'core' },
    { skill: 'MongoDB', hours: 8, priority: 'recommended' },
    { skill: 'Git & GitHub', hours: 4, priority: 'recommended' },
    { skill: 'Docker', hours: 8, priority: 'supporting' },
  ],
  'Backend Developer': [
    { skill: 'Node.js / Python', hours: 12, priority: 'core' },
    { skill: 'REST API Design', hours: 8, priority: 'core' },
    { skill: 'SQL Databases', hours: 10, priority: 'core' },
    { skill: 'Authentication & JWT', hours: 6, priority: 'core' },
    { skill: 'Docker', hours: 8, priority: 'recommended' },
    { skill: 'Redis Caching', hours: 6, priority: 'recommended' },
    { skill: 'System Design', hours: 10, priority: 'supporting' },
  ],
  'Frontend Developer': [
    { skill: 'HTML & CSS', hours: 8, priority: 'core' },
    { skill: 'JavaScript (ES6+)', hours: 10, priority: 'core' },
    { skill: 'React', hours: 14, priority: 'core' },
    { skill: 'TypeScript', hours: 8, priority: 'core' },
    { skill: 'State Management', hours: 6, priority: 'recommended' },
    { skill: 'CSS Frameworks', hours: 4, priority: 'recommended' },
    { skill: 'Web Performance', hours: 6, priority: 'supporting' },
  ],
  'Data Scientist': [
    { skill: 'Python', hours: 10, priority: 'core' },
    { skill: 'Pandas & NumPy', hours: 10, priority: 'core' },
    { skill: 'Machine Learning (scikit-learn)', hours: 14, priority: 'core' },
    { skill: 'Data Visualization', hours: 8, priority: 'recommended' },
    { skill: 'SQL', hours: 8, priority: 'recommended' },
    { skill: 'Statistics & Probability', hours: 10, priority: 'core' },
    { skill: 'Deep Learning (PyTorch)', hours: 14, priority: 'supporting' },
  ],
  'ML Engineer': [
    { skill: 'Python', hours: 10, priority: 'core' },
    { skill: 'PyTorch / TensorFlow', hours: 14, priority: 'core' },
    { skill: 'Model Deployment (FastAPI)', hours: 8, priority: 'core' },
    { skill: 'MLOps & Docker', hours: 10, priority: 'recommended' },
    { skill: 'Feature Engineering', hours: 8, priority: 'recommended' },
    { skill: 'Cloud (AWS/GCP)', hours: 8, priority: 'supporting' },
  ],
  'DevOps Engineer': [
    { skill: 'Linux & Bash', hours: 8, priority: 'core' },
    { skill: 'Docker & Kubernetes', hours: 14, priority: 'core' },
    { skill: 'CI/CD Pipelines', hours: 10, priority: 'core' },
    { skill: 'Terraform (IaC)', hours: 10, priority: 'recommended' },
    { skill: 'AWS / GCP / Azure', hours: 12, priority: 'recommended' },
    { skill: 'Monitoring & Logging', hours: 6, priority: 'supporting' },
  ],
};
const DEFAULT_ROLE_SKILLS = ROLE_SKILL_MAP['Full Stack Developer'];

function _resolveRoleSkills(targetRole) {
  if (!targetRole) return DEFAULT_ROLE_SKILLS;
  const key = Object.keys(ROLE_SKILL_MAP).find(
    (r) => r.toLowerCase() === targetRole.toLowerCase() || targetRole.toLowerCase().includes(r.split(' ')[0].toLowerCase())
  );
  return ROLE_SKILL_MAP[key] || DEFAULT_ROLE_SKILLS;
}

function _slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

/**
 * Local in-memory roadmap generator — zero external API dependency.
 * Filters out skills the student already has, packs remainder into weeks.
 */
function localRoadmapFallback(targetRole, currentSkills = []) {
  const required = _resolveRoleSkills(targetRole);
  const currentLower = currentSkills.map((s) => s.toLowerCase());
  const missing = required.filter((r) => !currentLower.some((c) => c.includes(_slug(r.skill).split('-')[0])));
  const skills = missing.length > 0 ? missing : required;

  // Pack into ~8h weeks
  const weeks = [];
  let weekBuffer = [];
  let weekHours = 0;
  skills.forEach((s) => {
    weekBuffer.push(s);
    weekHours += s.hours;
    if (weekHours >= 8) {
      weeks.push(weekBuffer);
      weekBuffer = [];
      weekHours = 0;
    }
  });
  if (weekBuffer.length > 0) weeks.push(weekBuffer);

  return {
    targetRole,
    summary: `A focused ${weeks.length}-week roadmap to help you become a ${targetRole}.`,
    coverage: `${weeks.length} weeks`,
    totalWeeks: weeks.length,
    totalTasks: skills.length,
    totalHours: skills.reduce((sum, s) => sum + s.hours, 0),
    strengths: currentSkills.slice(0, 3),
    weeks: weeks.map((group, i) => ({
      week: i + 1,
      title: `${group[0].priority === 'core' ? 'Core' : 'Recommended'}: ${group.map((g) => g.skill).join(', ')}`,
      focusHours: group.reduce((sum, g) => sum + g.hours, 0),
      tasks: group.map((g) => ({
        key: _slug(g.skill),
        skill: g.skill,
        title: `Learn ${g.skill}`,
        priority: g.priority,
        difficulty: g.hours <= 8 ? 'Beginner' : g.hours <= 12 ? 'Intermediate' : 'Advanced',
        estimatedHours: g.hours,
      })),
    })),
  };
}


/**
 * GET /api/growth
 * Returns active candidate growth plan with progress stats.
 */
export const getGrowthPlan = asyncHandler(async (req, res) => {
  const plan = await GrowthPlan.findOne({ user: req.user._id });
  return sendSuccess(res, { data: { plan: withProgress(plan) } });
});

/**
 * POST /api/growth/generate
 * Builds or regenerates the growth plan, preserving completed task states.
 */
export const generateGrowthPlan = asyncHandler(async (req, res) => {
  const targetRole = req.body.targetRole || req.user.profile?.dreamRole;
  if (!targetRole) throw ApiError.badRequest('Choose a target role to build your roadmap');

  const resume = await Resume.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  const currentSkills = collectStudentSkills(req.user, resume);

  // Try Django AI service first, fall back to Gemini if unavailable (e.g. Render cold start)
  let roadmap = null;
  try {
    const aiResponse = await aiService.recommendRoadmap({ targetRole, currentSkills });
    roadmap = aiResponse?.data;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[Growth] Django roadmap service unavailable, trying Gemini fallback:', err.message);
  }

  if (!roadmap) {
    // eslint-disable-next-line no-console
    console.log('[Growth] Using Gemini fallback to generate roadmap...');
    roadmap = await geminiGenerateRoadmap({ targetRole, currentSkills });
  }

  // Final local fallback — zero external API dependency, always succeeds
  if (!roadmap) {
    // eslint-disable-next-line no-console
    console.log('[Growth] Both AI services unavailable. Using local role-based roadmap fallback...');
    roadmap = localRoadmapFallback(targetRole, currentSkills);
  }

  if (!roadmap) {
    throw new ApiError(502, 'Unable to generate roadmap — AI service temporarily unavailable. Please try again in a moment.');
  }


  const existing = await GrowthPlan.findOne({ user: req.user._id });
  let weeks = preserveCompletion(roadmapToWeeks(roadmap), existing);

  // Inject Gemini AI Gap Weeks if roadmap role matches profile dreamRole
  const profileRole = req.user.profile?.dreamRole;
  const rolesMatch = !profileRole || profileRole.trim().toLowerCase() === targetRole.trim().toLowerCase();
  const gaps = rolesMatch ? resume?.keyGaps || [] : [];

  if (gaps.length > 0) {
    try {
      const gapWeeks = await geminiGenerateGapRoadmap({ gaps, targetRole });
      if (gapWeeks && gapWeeks.length > 0) {
        const formattedGapWeeks = gapWeeks.map((w) => ({
          title: w.topic,
          focusHours: null,
          tasks: w.tasks.map((t) => ({
            key: `gap-task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            title: t.name,
            estimatedHours: t.hours || 0,
            difficulty: 'Intermediate',
            priority: 'core',
            completed: false,
            completedAt: null,
          })),
        }));

        const merged = [...formattedGapWeeks, ...weeks];
        weeks = merged.map((w, idx) => ({ ...w, week: idx + 1 }));
      }
    } catch (err) {
      // eslint-disable-next-line no-console
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

/**
 * PATCH /api/growth/tasks/:key
 * Toggles completion status of a roadmap task.
 */
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

const CUSTOM_GOAL_KEY_PREFIX = 'custom-';
const CUSTOM_GOALS_WEEK_TITLE = 'Custom Goals';

function slugify(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');
}

/**
 * POST /api/growth/tasks
 * Adds a manually-created task under a "Custom Goals" week. The curated
 * roadmap runs on a small, fixed skill-requirement list (see ai-service/ml/data/roles.py),
 * so a strong candidate can exhaust every generated task quickly — this lets
 * them keep extending their own plan instead of hitting a dead end.
 */
export const addCustomTask = asyncHandler(async (req, res) => {
  const { title, skill, estimatedHours } = req.body;
  if (!title?.trim()) throw ApiError.badRequest('A task title is required');

  const plan = await GrowthPlan.findOne({ user: req.user._id });
  if (!plan) throw ApiError.notFound('No active roadmap. Generate one first.');

  const hours = Number(estimatedHours) > 0 ? Math.min(Number(estimatedHours), 80) : 2;
  const task = {
    key: `${CUSTOM_GOAL_KEY_PREFIX}${slugify(title)}-${Date.now()}`,
    skill: skill?.trim() || title.trim(),
    title: title.trim(),
    priority: 'supporting',
    difficulty: 'Intermediate',
    estimatedHours: hours,
    completed: false,
    completedAt: null,
  };

  let customWeek = plan.weeks.find((w) => w.title === CUSTOM_GOALS_WEEK_TITLE);
  if (!customWeek) {
    plan.weeks.push({ week: plan.weeks.length + 1, title: CUSTOM_GOALS_WEEK_TITLE, focusHours: 0, tasks: [] });
    plan.totalWeeks = (plan.totalWeeks || plan.weeks.length - 1) + 1;
    customWeek = plan.weeks[plan.weeks.length - 1];
  }
  customWeek.tasks.push(task);
  customWeek.focusHours = customWeek.tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  plan.totalHours = (plan.totalHours || 0) + hours;

  await plan.save();
  return sendSuccess(res, { statusCode: 201, message: 'Goal added to your roadmap', data: { plan: withProgress(plan) } });
});

/**
 * DELETE /api/growth/tasks/:key
 * Removes a manually-added custom task. Only tasks under the "Custom Goals"
 * week are user-deletable — curated/AI gap tasks stay tied to the roadmap
 * generation that produced them.
 */
export const removeCustomTask = asyncHandler(async (req, res) => {
  const { key } = req.params;
  if (!key.startsWith(CUSTOM_GOAL_KEY_PREFIX)) {
    throw ApiError.badRequest('Only custom goals can be removed');
  }

  const plan = await GrowthPlan.findOne({ user: req.user._id });
  if (!plan) throw ApiError.notFound('No active roadmap.');

  const customWeek = plan.weeks.find((w) => w.title === CUSTOM_GOALS_WEEK_TITLE);
  const task = customWeek?.tasks.find((t) => t.key === key);
  if (!customWeek || !task) throw ApiError.notFound('Custom goal not found');

  customWeek.tasks = customWeek.tasks.filter((t) => t.key !== key);
  customWeek.focusHours = customWeek.tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  plan.totalHours = Math.max(0, (plan.totalHours || 0) - (task.estimatedHours || 0));

  // Drop the whole week once it's empty so an empty "Custom Goals" section doesn't linger.
  if (customWeek.tasks.length === 0) {
    plan.weeks = plan.weeks.filter((w) => w.title !== CUSTOM_GOALS_WEEK_TITLE);
    plan.totalWeeks = Math.max(0, (plan.totalWeeks || plan.weeks.length + 1) - 1);
  }

  await plan.save();
  return sendSuccess(res, { message: 'Goal removed', data: { plan: withProgress(plan) } });
});
