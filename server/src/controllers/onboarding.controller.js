import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

/**
 * Onboarding captures the student's starting context (college, branch, semester,
 * dream role, current skills). Resume upload is handled separately via the
 * profile resume endpoint. Completing this unlocks the rest of the app.
 */

// PUT /api/onboarding
export const completeOnboarding = asyncHandler(async (req, res) => {
  const { college, branch, semester, dreamRole, skills } = req.body;
  const user = req.user;

  user.profile.college = college;
  user.profile.branch = branch;
  user.profile.semester = semester;
  user.profile.dreamRole = dreamRole;
  user.profile.skills = skills ?? [];
  user.onboardingCompleted = true;

  await user.save();

  return sendSuccess(res, {
    message: 'Onboarding complete. Welcome aboard!',
    data: { user: user.toSafeJSON() },
  });
});
