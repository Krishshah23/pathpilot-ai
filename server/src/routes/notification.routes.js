/**
 * routes/notification.routes.js — User Notification Drawer Router
 *
 * ENDPOINTS:
 * - GET   /api/notifications          → List candidate notifications (newest unread first)
 * - PATCH /api/notifications/mark-all → Mark all candidate notifications as read
 * - PATCH /api/notifications/:id      → Mark individual notification as read
 */

import { Router } from 'express';
import { list, markAsRead, markAllAsRead } from '../controllers/notification.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/', list);
router.patch('/mark-all', markAllAsRead);
router.patch('/:id', markAsRead);

export default router;
