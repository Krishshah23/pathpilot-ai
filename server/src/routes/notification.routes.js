import { Router } from 'express';
import { list, markAsRead, markAllAsRead } from '../controllers/notification.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect); // all notification routes require login

router.get('/', list);
router.patch('/mark-all', markAllAsRead);
router.patch('/:id', markAsRead);

export default router;
