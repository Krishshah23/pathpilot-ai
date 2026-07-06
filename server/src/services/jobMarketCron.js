import cron from 'node-cron';
import { refreshAllRoles } from './jobMarket.service.js';
import { env } from '../config/env.js';

/*
  Weekly market-data fetch scheduler.

  Runs every Sunday at 2:00 AM (server time) and also triggers once on
  startup if no data exists for the current week. This ensures:
    1. Fresh data is always available by Monday.
    2. First deploy / empty DB doesn't wait until next Sunday.
*/

/** @type {import('node-cron').ScheduledTask | null} */
let scheduledTask = null;

/**
 * Start the weekly job-market cron job.
 * Safe to call multiple times — idempotent.
 */
export function startJobMarketCron() {
  // Skip if Adzuna isn't configured — no point scheduling.
  if (!env.adzuna.appId || !env.adzuna.appKey) {
    // eslint-disable-next-line no-console
    console.log(
      '[JobMarketCron] Adzuna credentials not configured. Skipping market data scheduler. ' +
        'Set ADZUNA_APP_ID and ADZUNA_APP_KEY in .env to enable.'
    );
    return;
  }

  if (scheduledTask) return; // already running

  // Cron: "At 02:00 on Sunday" → 0 2 * * 0
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

  // Trigger an initial fetch in the background so the DB isn't empty.
  setImmediate(async () => {
    try {
      // Only fetch if we have no data for this week at all.
      const { JobMarketSnapshot } = await import('../models/JobMarketSnapshot.js');
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
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
 * Stop the cron job (for graceful shutdown / tests).
 */
export function stopJobMarketCron() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}
