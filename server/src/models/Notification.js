/**
 * models/Notification.js — In-App Notification Mongoose Model
 *
 * WHAT THIS MODEL STORES:
 * Short user-facing notifications that appear in the notification drawer
 * (the bell icon in AppShell.jsx's top navigation bar).
 *
 * NOTIFICATIONS ARE SIDE-EFFECTS:
 * Notifications are never created by user action — they are created as
 * side-effects of backend operations. Currently triggered by:
 *   - resume.controller.js → analyzeResume()
 *     → Creates a 'success' notification: 'Resume Processed Successfully'
 *
 * To add a new notification trigger:
 *   import { Notification } from '../models/Notification.js';
 *   await Notification.create({
 *     user: userId,
 *     title: 'Something happened',
 *     message: 'More details about what happened.',
 *     type: 'info'
 *   });
 *
 * NOTIFICATION TYPES:
 * - 'info':    Blue — general information (e.g. new feature available)
 * - 'warning': Amber — something needs attention (e.g. resume too short)
 * - 'success': Green — positive event (e.g. resume analyzed successfully)
 *
 * READ STATUS:
 * `read: false` by default. The user marks notifications as read via:
 * - PATCH /api/notifications/:id    → mark one as read
 * - PATCH /api/notifications/mark-all → mark all as read
 *
 * COMPOUND INDEX:
 * { user: 1, read: 1, createdAt: -1 } optimizes the main query:
 *   "Get all unread notifications for this user, newest first"
 * which is called every time the notification drawer opens.
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Main Notification schema — the `notifications` collection in MongoDB.
 */
const notificationSchema = new Schema(
  {
    // The user this notification is addressed to
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // Part of compound index below
    },

    // Short headline shown in the notification list (e.g. 'Resume Processed')
    title: { type: String, required: true, trim: true },

    // Longer description providing context
    // (e.g. 'Your resume has been analyzed and your Path Score has been updated.')
    message: { type: String, required: true, trim: true },

    // Visual type — drives the color and icon shown in the notification drawer:
    // 'info'    → blue info icon
    // 'warning' → amber warning icon
    // 'success' → green checkmark icon
    type: {
      type: String,
      enum: ['info', 'warning', 'success'],
      default: 'info',
    },

    // Whether the user has opened/acknowledged this notification
    // The notification badge count is: Notification.countDocuments({ user, read: false })
    read: { type: Boolean, default: false },
  },
  { timestamps: true } // createdAt used for "5 minutes ago" relative timestamps in UI
);

// ── Compound Index ─────────────────────────────────────────────────────────────
// Optimizes: Notification.find({ user: userId, read: false }).sort({ createdAt: -1 })
// MongoDB can use this index to:
//   1. Jump directly to the user's notifications (user: 1)
//   2. Filter by read status without scanning all user's notifications (read: 1)
//   3. Return them in descending time order (createdAt: -1)
// All three operations use the same index — no separate sort scan needed.
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
