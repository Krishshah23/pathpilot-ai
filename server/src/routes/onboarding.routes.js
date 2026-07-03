import { Router } from 'express';
import { completeOnboarding } from '../controllers/onboarding.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { onboardingSchema } from '../validators/profile.validators.js';

const router = Router();

router.put('/', protect, validate(onboardingSchema), completeOnboarding);

export default router;
