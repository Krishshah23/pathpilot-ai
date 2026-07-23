/**
 * services/growth.service.js — Learning Roadmap Shaping & Progress Preservation
 *
 * ARCHITECTURAL PURPOSE:
 * 1. MAPPING: Converts raw Django ML roadmap JSON into GrowthPlan Mongoose schema structures.
 * 2. PROGRESS PRESERVATION: Ensures that when a student regenerates their roadmap
 *    (e.g., after acquiring new skills or uploading a fresh resume), completed task states
 *    are carried over by matching stable task `key` identifiers.
 * 3. DERIVED METRICS: Calculates completion percentages, completed hours, and per-week
 *    progress objects for immediate rendering in the ExecutionEnginePage UI.
 */

/**
 * Maps Django ML / Gemini JSON payloads into structured Mongoose sub-documents.
 * @param {object} roadmap - Raw roadmap object from AI service
 * @returns {Array<object>} Formatted week schemas with initialized false task completion states
 */
export function roadmapToWeeks(roadmap) {
  return (roadmap.weeks || []).map((week) => ({
    week: week.week,
    title: week.title,
    focusHours: week.focusHours,
    tasks: (week.tasks || []).map((task) => ({
      key: task.key,
      skill: task.skill,
      title: task.title,
      priority: task.priority,
      difficulty: task.difficulty,
      estimatedHours: task.estimatedHours,
      completed: false,
      completedAt: null,
    })),
  }));
}

/**
 * Preserves completed task states from an existing GrowthPlan across regenerations.
 * Tasks are matched by their stable `key` string (e.g., "node-js" or "gap-task-docker").
 *
 * @param {Array<object>} newWeeks - Freshly generated roadmap weeks
 * @param {object} [existingPlan] - Previous GrowthPlan document
 * @returns {Array<object>} Merged week objects with completion flags intact
 */
export function preserveCompletion(newWeeks, existingPlan) {
  if (!existingPlan) return newWeeks;

  // Build a lookup Map of completed task keys -> completedAt timestamp
  const done = new Map();
  existingPlan.weeks.forEach((week) =>
    week.tasks.forEach((task) => {
      if (task.completed) done.set(task.key, task.completedAt || new Date());
    })
  );

  if (!done.size) return newWeeks;

  // Apply completed flags to new tasks matching known keys
  return newWeeks.map((week) => ({
    ...week,
    tasks: week.tasks.map((task) =>
      done.has(task.key)
        ? { ...task, completed: true, completedAt: done.get(task.key) }
        : task
    ),
  }));
}

/**
 * Decorates a GrowthPlan document with derived completion metrics for API responses.
 * Computes `completedTasks`, `completedHours`, and overall completion percentage.
 *
 * @param {object} plan - GrowthPlan document or object
 * @returns {object} Serialized plan enriched with progress calculations
 */
export function withProgress(plan) {
  if (!plan) return null;
  const obj = typeof plan.toObject === 'function' ? plan.toObject() : plan;

  let completedTasks = 0;
  let completedHours = 0;

  const weeks = obj.weeks.map((week) => {
    const total = week.tasks.length;
    const done = week.tasks.filter((t) => t.completed).length;
    completedTasks += done;
    completedHours += week.tasks
      .filter((t) => t.completed)
      .reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

    return {
      ...week,
      completedTasks: done,
      totalTasks: total,
      percent: total ? Math.round((done / total) * 100) : 0,
    };
  });

  const percent = obj.totalTasks ? Math.round((completedTasks / obj.totalTasks) * 100) : 0;

  return {
    ...obj,
    weeks,
    progress: {
      percent,
      completedTasks,
      totalTasks: obj.totalTasks,
      completedHours,
      totalHours: obj.totalHours,
    },
  };
}
