/**
 * routes/profile.routes.js — Candidate Profile & Public Career Card Router
 *
 * ENDPOINTS:
 * - GET   /api/profile/public/:publicCardId → Unauthenticated public career card view
 * - GET   /api/profile                       → Get candidate profile details
 * - PATCH /api/profile                       → Update profile fields (dreamRole, skills, college)
 * - PATCH /api/profile/password              → Change candidate password
 * - PATCH /api/profile/public-card           → Toggle public career card visibility
 * - POST  /api/profile/avatar                → Upload candidate profile picture
 * - POST  /api/profile/resume                → Update resume file pointer URL
 */

import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  uploadResume,
  changePassword,
  getPublicCard,
  togglePublicCard,
} from '../controllers/profile.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { updateProfileSchema, changePasswordSchema } from '../validators/profile.validators.js';

const router = Router();

// Public route — no authentication required
router.get('/public/:publicCardId', getPublicCard);

// Authenticated profile management routes
router.use(protect);

router.get('/', getProfile);
router.patch('/', validate(updateProfileSchema), updateProfile);
router.patch('/password', validate(changePasswordSchema), changePassword);
router.patch('/public-card', togglePublicCard);
router.post('/avatar', upload('avatar', 'file'), uploadAvatar);
router.post('/resume', upload('resume', 'file'), uploadResume);

export default router;
