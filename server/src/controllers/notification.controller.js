import { Notification } from '../models/Notification.js';
import { Opportunity } from '../models/Opportunity.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/notifications
 * Get all notifications for the user. Runs lazy weekly check-in check first.
 */
export const list = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Lazy check: Weekly check-in trigger
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Check if they already received a weekly check-in in the last 7 days
    const recentReminder = await Notification.findOne({
      user: userId,
      title: 'Weekly Check-in',
      createdAt: { $gte: sevenDaysAgo },
    });

    if (!recentReminder) {
      // Check if they recently updated profile or created/updated opportunities
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
    console.error('Lazy weekly notification check failed:', err.message);
  }

  const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(50);
  const unreadCount = await Notification.countDocuments({ user: userId, read: false });

  sendSuccess(res, { data: { notifications, unreadCount } });
});

/**
 * PATCH /api/notifications/:id
 * Mark a single notification as read.
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
 * Mark all user notifications as read.
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });

  sendSuccess(res, { message: 'All notifications marked as read' });
});
