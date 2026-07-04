/*
  Growth Path helpers: shaping the AI roadmap into a persisted plan, preserving
  progress across regenerations, and computing completion stats for responses.
*/

/** Maps the Django roadmap payload into GrowthPlan week/task documents. */
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
 * Carries completion state from an existing plan onto freshly generated weeks,
 * matched by task `key`, so regenerating a roadmap never wipes real progress.
 */
export function preserveCompletion(newWeeks, existingPlan) {
  if (!existingPlan) return newWeeks;
  const done = new Map();
  existingPlan.weeks.forEach((week) =>
    week.tasks.forEach((task) => {
      if (task.completed) done.set(task.key, task.completedAt || new Date());
    })
  );
  if (!done.size) return newWeeks;

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
 * Serializes a plan document with derived progress (overall + per-week), so the
 * frontend renders completion without recomputing it.
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
