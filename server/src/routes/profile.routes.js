import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  uploadResume,
  changePassword,
} from '../controllers/profile.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { updateProfileSchema, changePasswordSchema } from '../validators/profile.validators.js';

const router = Router();

router.use(protect); // everything here requires authentication

router.get('/', getProfile);
router.patch('/', validate(updateProfileSchema), updateProfile);
router.patch('/password', validate(changePasswordSchema), changePassword);
router.post('/avatar', upload('avatar', 'file'), uploadAvatar);
router.post('/resume', upload('resume', 'file'), uploadResume);

export default router;
