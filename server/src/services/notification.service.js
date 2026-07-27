/**
 * services/notification.service.js — Notification Creation Helper
 *
 * WHY THIS EXISTS:
 * Before this file, notifications were created with ad-hoc `Notification.create()`
 * calls scattered across controllers (resume.controller.js, notification.controller.js's
 * lazy weekly check-in). As more triggers were added (score deltas, stale resume
 * reminders, job market alerts, milestones, weekly digest), that pattern would mean
 * copy-pasting the same "don't spam the same notification twice" guard everywhere.
 *
 * This file is the single place new notification triggers should go through.
 */

import { Notification } from '../models/Notification.js';

/**
 * Creates a notification for a user.
 * @param {string} userId
 * @param {object} params
 * @param {'info'|'warning'|'success'} [params.type='info']
 * @param {string} params.title
 * @param {string} params.message
 * @param {string} [params.actionLink='']
 */
export function notify(userId, { type = 'info', title, message, actionLink = '' } = {}) {
  return Notification.create({ user: userId, type, title, message, actionLink });
}

/**
 * Creates a notification only if one with the same title hasn't already been sent
 * to this user within the lookback window. Prevents duplicate/spammy notifications
 * for recurring checks (e.g. a daily cron re-evaluating the same condition).
 *
 * @param {string} userId
 * @param {object} params
 * @param {string} params.title - Used as the dedup key alongside userId
 * @param {number} [params.lookbackDays=1] - How far back to check for a duplicate
 * @returns {Promise<object|null>} The created notification, or null if skipped as a duplicate
 */
export async function notifyOnce(userId, { title, lookbackDays = 1, ...rest } = {}) {
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  const existing = await Notification.findOne({
    user: userId,
    title,
    createdAt: { $gte: since },
  });
  if (existing) return null;

  return notify(userId, { title, ...rest });
}
