/**
 * services/jobMarketCron.js — Scheduled Job Market Refresh Cron Task
 *
 * SCHEDULING STRATEGY:
 * - Runs every Sunday at 02:00 AM server time via `node-cron` expression `0 2 * * 0`.
 * - Triggers an immediate non-blocking check on server startup (`setImmediate`).
 *   If no snapshots exist for the current week, it fetches immediately so the database
 *   is never empty on new deployments.
 *
 * IDEMPOTENCY & SAFEGUARDS:
 * - Skips execution if `ADZUNA_APP_ID` or `ADZUNA_APP_KEY` environment variables are absent.
 * - Prevents multiple task instances if `startJobMarketCron()` is called more than once.
 * - Graceful shutdown supported via `stopJobMarketCron()`.
 */

import cron from 'node-cron';
import { refreshAllRoles } from './jobMarket.service.js';
import { env } from '../config/env.js';

/** @type {import('node-cron').ScheduledTask | null} */
let scheduledTask = null;

/**
 * Initializes and starts the weekly market data refresh cron job.
 * Safe to call multiple times (idempotent).
 */
export function startJobMarketCron() {
  // Skip if Adzuna credentials are not configured
  if (!env.adzuna.appId || !env.adzuna.appKey) {
    // eslint-disable-next-line no-console
    console.log(
      '[JobMarketCron] Adzuna credentials not configured. Skipping market data scheduler. ' +
        'Set ADZUNA_APP_ID and ADZUNA_APP_KEY in .env to enable.'
    );
    return;
  }

  if (scheduledTask) return; // Prevent duplicate task registration

  // Schedule task for Sunday at 02:00 AM (0 2 * * 0)
  scheduledTask = cron.schedule('0 2 * * 0', async () => {
    try {
      await refreshAllRoles();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[JobMarketCron] Scheduled refresh failed:', err.message);
    }
  });

  // eslint-disable-next-line no-console
  console.log('[JobMarketCron] Weekly market data refresh scheduled (Sunday 02:00).');

  // Asynchronous startup check: fill database if current week is missing market data
  setImmediate(async () => {
    try {
      const { JobMarketSnapshot } = await import('../models/JobMarketSnapshot.js');
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Get Monday of current week
      const weekStart = new Date(now.setDate(diff));
      weekStart.setHours(0, 0, 0, 0);

      const existing = await JobMarketSnapshot.countDocuments({ weekOf: weekStart });
      if (existing === 0) {
        // eslint-disable-next-line no-console
        console.log('[JobMarketCron] No data for current week. Running initial fetch…');
        await refreshAllRoles();
      } else {
        // eslint-disable-next-line no-console
        console.log(`[JobMarketCron] ${existing} snapshots already exist for this week.`);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[JobMarketCron] Initial fetch check failed:', err.message);
    }
  });
}

/**
 * Stops the scheduled cron task during graceful server shutdown or test cleanup.
 */
export function stopJobMarketCron() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}
