import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.middleware.js';
import * as ctrl from '../controllers/admin.controller.js';

const router = Router();

// All admin routes require authentication + admin role.
router.use(protect, authorize('admin'));

router.get('/stats', ctrl.getStats);
router.get('/users', ctrl.listUsers);
router.get('/users/:id', ctrl.getUser);
router.patch('/users/:id', ctrl.updateUser);
router.delete('/users/:id', ctrl.deleteUser);

export default router;
