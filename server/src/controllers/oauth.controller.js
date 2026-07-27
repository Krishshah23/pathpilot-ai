/**
 * controllers/oauth.controller.js — Google OAuth Controller
 *
 * ARCHITECTURAL ROLE:
 * Handles the server side of "Continue with Google". The client uses Firebase's
 * signInWithPopup() to authenticate with Google directly, then sends the resulting
 * Firebase idToken here. This controller verifies that token with firebase-admin,
 * finds-or-creates the matching User document, and issues the same dual-JWT
 * session (access token + HttpOnly refresh cookie) as email/password login.
 */

import { adminAuth } from '../config/firebase.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { issueSession } from './auth.controller.js';

/**
 * POST /api/auth/google
 * Verifies a Firebase Google idToken, finds or creates the user, and issues a session.
 */
export const googleAuth = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) throw ApiError.badRequest('Missing idToken');

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired Google sign-in token');
  }

  const { uid, email, name } = decoded;
  if (!email) throw ApiError.badRequest('Google account has no email');

  let user = await User.findOne({ $or: [{ googleId: uid }, { email }] });

  if (!user) {
    user = await User.create({
      name: name || email.split('@')[0],
      email,
      googleId: uid,
      authProvider: 'google',
      isEmailVerified: true, // Google has already verified the email
    });
  } else if (!user.googleId) {
    // Existing local account signing in with Google for the first time — link it
    user.googleId = uid;
    user.isEmailVerified = true;
    await user.save();
  }

  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = issueSession(res, user);
  return sendSuccess(res, {
    message: 'Signed in with Google successfully',
    data: { user: user.toSafeJSON(), accessToken },
  });
});
