/**
 * controllers/onboarding.controller.js — Candidate Onboarding Wizard Controller
 *
 * ARCHITECTURAL ROLE:
 * Captures initial target role (`dreamRole`) and initial candidate skills array (`skills`)
 * submitted during onboarding step 3. Sets `onboardingCompleted = true` on the candidate user document.
 */

import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

/**
 * PUT /api/onboarding
 * Completes candidate onboarding wizard and stores initial target role and skills.
 */
export const completeOnboarding = asyncHandler(async (req, res) => {
  const { dreamRole, skills } = req.body;
  const user = req.user;

  user.profile.dreamRole = dreamRole;
  user.profile.skills = skills ?? [];
  user.onboardingCompleted = true;

  await user.save();

  return sendSuccess(res, {
    message: 'Onboarding complete. Welcome aboard!',
    data: { user: user.toSafeJSON() },
  });
});
