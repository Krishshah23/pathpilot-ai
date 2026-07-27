/**
 * models/JobAlertState.js — Per-Role Job Alert Tracking
 *
 * WHY THIS EXISTS:
 * The "new jobs found for your role" notification (notificationCron.js) needs to know
 * which TheirStack job IDs have already been surfaced to users, so it only notifies
 * about jobs that are genuinely new since the last check — not the same listings
 * every time the daily cron runs.
 *
 * ONE ROW PER ROLE (not per user): the check runs once per tracked role and fans the
 * notification out to every user targeting that role, rather than hitting the
 * TheirStack API once per user (which would burn through the free-tier credit budget
 * — see liveJobs.service.js's own docs on the 200 credits/month limit).
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

const jobAlertStateSchema = new Schema(
  {
    // Job role this alert state tracks (matches TRACKED_ROLES / user.profile.dreamRole)
    role: { type: String, required: true, unique: true, trim: true, index: true },

    // TheirStack job IDs already surfaced to users for this role.
    // Capped at 300 (see notificationCron.js) so this array doesn't grow unbounded.
    notifiedJobIds: { type: [String], default: [] },

    // When this role was last checked for new listings
    lastCheckedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const JobAlertState = mongoose.model('JobAlertState', jobAlertStateSchema);
