/**
 * services/notificationCron.js — Scheduled Smart Notification Triggers
 *
 * Mirrors the pattern established by jobMarketCron.js: node-cron tasks registered
 * once at server startup, each independently exported so they can also be invoked
 * directly (e.g. for a manual admin "run now" endpoint, or tests) without waiting
 * for the schedule.
 *
 * FOUR SCHEDULED TRIGGERS:
 * 1. runDailyJobAlerts()   — "N new jobs found for your role" (daily, 09:00)
 * 2. runStaleResumeCheck() — "It's been 30 days..." reminder (daily, 09:15)
 * 3. runSkillTrendCheck()  — "X is trending for your role" (weekly, Sunday 03:00 —
 *    one hour after jobMarketCron's Sunday 02:00 refresh so this week's snapshot exists)
 * 4. runWeeklyDigest()     — Path Score + sessions + top gap summary (weekly, Monday 08:00)
 *
 * TO ADD ANOTHER TRIGGER: write a new `run*()` function following the same shape
 * (iterate the relevant users/roles, call notify()/notifyOnce() from
 * notification.service.js), then register it in startNotificationCron() below.
 */

import cron from 'node-cron';
import { User } from '../models/User.js';
import { Resume } from '../models/Resume.js';
import { InterviewSession } from '../models/InterviewSession.js';
import { JobMarketSnapshot } from '../models/JobMarketSnapshot.js';
import { JobAlertState } from '../models/JobAlertState.js';
import { getLiveJobs } from './liveJobs.service.js';
import { TRACKED_ROLES } from './jobMarket.service.js';
import { notify, notifyOnce } from './notification.service.js';

const MAX_TRACKED_JOB_IDS = 300; // bounds JobAlertState.notifiedJobIds growth
const STALE_RESUME_DAYS = 30;
const SKILL_TREND_DELTA = 15; // percentage-point jump considered "trending"

/** @type {Array<import('node-cron').ScheduledTask>} */
const scheduledTasks = [];

// ── 1. New live jobs found ────────────────────────────────────────────────
/**
 * For each tracked role, checks TheirStack (via the existing cached liveJobs
 * service) for job IDs not seen before, and notifies every user targeting
 * that role once if any are found. Runs once per role, not once per user —
 * see JobAlertState.js for why.
 */
export async function runDailyJobAlerts() {
  for (const role of TRACKED_ROLES) {
    try {
      const { jobs } = await getLiveJobs(role);
      if (!jobs.length) continue;

      let state = await JobAlertState.findOne({ role });
      const seenIds = new Set(state?.notifiedJobIds || []);
      const newJobs = jobs.filter((j) => !seenIds.has(String(j.id)));

      if (newJobs.length > 0) {
        const users = await User.find({ 'profile.dreamRole': { $regex: `^${escapeRegex(role)}$`, $options: 'i' } }).select('_id');
        for (const u of users) {
          await notifyOnce(u._id, {
            title: `${newJobs.length} new job${newJobs.length === 1 ? '' : 's'} found for ${role}`,
            message: `New live openings for ${role} just came in — check them out before they fill up.`,
            type: 'info',
            actionLink: '/talent-analyzer',
            lookbackDays: 1,
          });
        }
      }

      const updatedIds = [...seenIds, ...newJobs.map((j) => String(j.id))].slice(-MAX_TRACKED_JOB_IDS);
      await JobAlertState.findOneAndUpdate(
        { role },
        { role, notifiedJobIds: updatedIds, lastCheckedAt: new Date() },
        { upsert: true }
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[NotificationCron] Job alert check failed for "${role}":`, err.message);
    }
  }
}

// ── 2. Stale resume reminder ─────────────────────────────────────────────
/** Reminds users whose most recent resume analysis is 30+ days old. */
export async function runStaleResumeCheck() {
  const staleThreshold = new Date(Date.now() - STALE_RESUME_DAYS * 24 * 60 * 60 * 1000);

  const users = await User.find({ 'profile.resumeUrl': { $ne: '' } }).select('_id');
  for (const u of users) {
    try {
      const latestResume = await Resume.findOne({ user: u._id }).sort({ createdAt: -1 }).select('createdAt');
      if (latestResume && latestResume.createdAt < staleThreshold) {
        await notifyOnce(u._id, {
          title: 'Time to refresh your resume',
          message: `Your resume hasn't been updated in ${STALE_RESUME_DAYS}+ days. A fresh analysis keeps your Path Score and gap recommendations accurate.`,
          type: 'warning',
          actionLink: '/talent-analyzer',
          lookbackDays: STALE_RESUME_DAYS - 5, // recurs roughly monthly if still stale
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[NotificationCron] Stale resume check failed for user ${u._id}:`, err.message);
    }
  }
}

// ── 3. Skill demand trend change ─────────────────────────────────────────
/** Compares this week's JobMarketSnapshot to last week's per role; flags big frequency jumps. */
export async function runSkillTrendCheck() {
  for (const role of TRACKED_ROLES) {
    try {
      const weeks = await JobMarketSnapshot.find({ role }).distinct('weekOf');
      if (weeks.length < 2) continue; // need at least 2 weeks of history to compare

      const sortedWeeks = weeks.map((w) => new Date(w)).sort((a, b) => b - a);
      const [thisWeek, lastWeek] = sortedWeeks;

      const [thisWeekSnaps, lastWeekSnaps] = await Promise.all([
        JobMarketSnapshot.find({ role, weekOf: thisWeek }).lean(),
        JobMarketSnapshot.find({ role, weekOf: lastWeek }).lean(),
      ]);

      const lastWeekMap = new Map(lastWeekSnaps.map((s) => [s.skill, s.frequency]));
      const trending = thisWeekSnaps
        .map((s) => ({ skill: s.skill, delta: s.frequency - (lastWeekMap.get(s.skill) ?? 0) }))
        .filter((s) => s.delta >= SKILL_TREND_DELTA)
        .sort((a, b) => b.delta - a.delta);

      if (trending.length === 0) continue;

      const top = trending[0];
      const users = await User.find({ 'profile.dreamRole': { $regex: `^${escapeRegex(role)}$`, $options: 'i' } }).select('_id');
      for (const u of users) {
        await notifyOnce(u._id, {
          title: `${top.skill} is trending for ${role}`,
          message: `${top.skill} appeared in ${top.delta} percentage points more job postings this week — worth adding to your skill set.`,
          type: 'info',
          actionLink: '/talent-analyzer',
          lookbackDays: 6,
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[NotificationCron] Skill trend check failed for "${role}":`, err.message);
    }
  }
}

// ── 4. Weekly digest ──────────────────────────────────────────────────────
/** Every Monday: Path Score, sessions completed this week, and top skill gap. */
export async function runWeeklyDigest() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const users = await User.find({ onboardingCompleted: true }).select('_id profile.dreamRole pathScoreCache');
  for (const u of users) {
    try {
      const [sessionCount, latestResume] = await Promise.all([
        InterviewSession.countDocuments({ user: u._id, completedAt: { $gte: weekAgo } }),
        Resume.findOne({ user: u._id }).sort({ createdAt: -1 }).select('keyGaps'),
      ]);

      const score = u.pathScoreCache?.displayScore ?? 0;
      const topGap = latestResume?.keyGaps?.[0];

      const parts = [`Path Score: ${score}/100`, `${sessionCount} interview session${sessionCount === 1 ? '' : 's'} this week`];
      if (topGap) parts.push(`Top focus area: ${topGap}`);

      await notify(u._id, {
        title: 'Your weekly PathPilot summary',
        message: parts.join(' · '),
        type: 'info',
        actionLink: '/dashboard',
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[NotificationCron] Weekly digest failed for user ${u._id}:`, err.message);
    }
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Registers all notification cron tasks. Safe to call multiple times (idempotent). */
export function startNotificationCron() {
  if (scheduledTasks.length) return; // Already registered

  scheduledTasks.push(
    cron.schedule('0 9 * * *', () => runDailyJobAlerts().catch((err) => console.error('[NotificationCron] runDailyJobAlerts crashed:', err))), // eslint-disable-line no-console
    cron.schedule('15 9 * * *', () => runStaleResumeCheck().catch((err) => console.error('[NotificationCron] runStaleResumeCheck crashed:', err))), // eslint-disable-line no-console
    cron.schedule('0 3 * * 0', () => runSkillTrendCheck().catch((err) => console.error('[NotificationCron] runSkillTrendCheck crashed:', err))), // eslint-disable-line no-console
    cron.schedule('0 8 * * 1', () => runWeeklyDigest().catch((err) => console.error('[NotificationCron] runWeeklyDigest crashed:', err))) // eslint-disable-line no-console
  );

  // eslint-disable-next-line no-console
  console.log('[NotificationCron] Scheduled: job alerts (daily 09:00), stale resume (daily 09:15), skill trends (Sun 03:00), weekly digest (Mon 08:00).');
}

/** Stops all scheduled notification cron tasks. */
export function stopNotificationCron() {
  while (scheduledTasks.length) {
    scheduledTasks.pop().stop();
  }
}
