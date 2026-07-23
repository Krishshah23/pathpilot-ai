/**
 * routes/admin.routes.js — Admin Panel Router
 *
 * SECURITY:
 * Enforces `protect` (authenticated) AND `authorize('admin')` (admin role required).
 * Non-admin users attempting to access these routes receive 403 Forbidden.
 *
 * ENDPOINTS:
 * - GET    /api/admin/stats     → Platform-wide statistics (users count, resumes count, etc.)
 * - GET    /api/admin/users     → Paginated user listing
 * - GET    /api/admin/users/:id → Detailed user breakdown document
 * - PATCH  /api/admin/users/:id → Modify user role or status flags
 * - DELETE /api/admin/users/:id → Delete user and associated records
 */

import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.middleware.js';
import * as ctrl from '../controllers/admin.controller.js';

const router = Router();

// Require authenticated user with 'admin' role
router.use(protect, authorize('admin'));

router.get('/stats', ctrl.getStats);
router.get('/users', ctrl.listUsers);
router.get('/users/:id', ctrl.getUser);
router.patch('/users/:id', ctrl.updateUser);
router.delete('/users/:id', ctrl.deleteUser);

export default router;
