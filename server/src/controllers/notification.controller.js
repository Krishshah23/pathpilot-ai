/**
 * controllers/notification.controller.js — Candidate Notification Drawer Controller
 *
 * ARCHITECTURAL ROLE:
 * Handles candidate notifications listing and read state mutation.
 * Features a LAZY WEEKLY CHECK-IN TRIGGER:
 * On `GET /api/notifications`, checks if the candidate hasn't received a check-in reminder
 * or updated their profile in the last 7 days; if so, lazily creates a weekly check-in notification.
 */

import { Notification } from '../models/Notification.js';
import { Opportunity } from '../models/Opportunity.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/notifications
 * Returns candidate notifications list and unread count. Runs lazy weekly check-in trigger.
 */
export const list = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Lazy weekly check-in trigger
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentReminder = await Notification.findOne({
      user: userId,
      title: 'Weekly Check-in',
      createdAt: { $gte: sevenDaysAgo },
    });

    if (!recentReminder) {
      const userRecentlyUpdated = req.user.updatedAt >= sevenDaysAgo;
      const recentOpp = await Opportunity.findOne({
        user: userId,
        updatedAt: { $gte: sevenDaysAgo },
      });

      if (!userRecentlyUpdated && !recentOpp) {
        await Notification.create({
          user: userId,
          title: 'Weekly Check-in',
          message: 'Ready to take the next step? Keep your profile updated for accurate matching.',
          type: 'warning',
        });
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Lazy weekly notification check failed:', err.message);
  }

  const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(50);
  const unreadCount = await Notification.countDocuments({ user: userId, read: false });

  sendSuccess(res, { data: { notifications, unreadCount } });
});

/**
 * PATCH /api/notifications/:id
 * Marks a single notification as read.
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  );

  if (!notif) throw ApiError.notFound('Notification not found');

  sendSuccess(res, { message: 'Notification marked as read', data: { notification: notif } });
});

/**
 * PATCH /api/notifications/mark-all
 * Marks all candidate notifications as read.
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });

  sendSuccess(res, { message: 'All notifications marked as read' });
});
