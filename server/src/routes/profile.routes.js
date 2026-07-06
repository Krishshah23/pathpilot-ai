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

// Publicly shareable career card (no auth needed)
router.get('/public/:publicCardId', getPublicCard);

router.use(protect); // everything below requires authentication

router.get('/', getProfile);
router.patch('/', validate(updateProfileSchema), updateProfile);
router.patch('/password', validate(changePasswordSchema), changePassword);
router.patch('/public-card', togglePublicCard);
router.post('/avatar', upload('avatar', 'file'), uploadAvatar);
router.post('/resume', upload('resume', 'file'), uploadResume);

export default router;
