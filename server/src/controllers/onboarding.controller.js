import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

/**
 * Onboarding captures only the two fields that drive the app:
 *   - dreamRole  → personalises Path Score, Skill Roadmap, Interview Prep
 *   - skills     → seeds the gap analysis
 *
 * College / branch / semester were removed — they're student-specific metadata
 * that had no downstream use. Resume upload is also skipped here; users upload
 * inside Resume Strategy where they get full AI feedback immediately.
 */

// PUT /api/onboarding
export const completeOnboarding = asyncHandler(async (req, res) => {
  const { dreamRole, skills } = req.body;
  const user = req.user;

  user.profile.dreamRole = dreamRole;
  user.profile.skills    = skills ?? [];
  user.onboardingCompleted = true;

  await user.save();

  return sendSuccess(res, {
    message: 'Onboarding complete. Welcome aboard!',
    data: { user: user.toSafeJSON() },
  });
});
