import fs from 'node:fs';
import path from 'node:path';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { publicUrl } from '../middleware/upload.middleware.js';

/** Deletes a previously-uploaded local file (best effort, ignores misses). */
function removeLocalFile(publicPath) {
  if (!publicPath || !publicPath.startsWith('/uploads/')) return;
  const abs = path.join(process.cwd(), publicPath.replace(/^\//, ''));
  fs.promises.unlink(abs).catch(() => {});
}

// GET /api/profile
export const getProfile = asyncHandler(async (req, res) => {
  return sendSuccess(res, { data: { user: req.user.toSafeJSON() } });
});

// PATCH /api/profile
export const updateProfile = asyncHandler(async (req, res) => {
  const user = req.user;
  const { name, college, branch, semester, dreamRole, skills } = req.body;

  if (name !== undefined) user.name = name;
  if (college !== undefined) user.profile.college = college;
  if (branch !== undefined) user.profile.branch = branch;
  if (semester !== undefined) user.profile.semester = semester;
  if (dreamRole !== undefined) user.profile.dreamRole = dreamRole;
  if (skills !== undefined) user.profile.skills = skills;

  await user.save();

  return sendSuccess(res, {
    message: 'Profile updated',
    data: { user: user.toSafeJSON() },
  });
});

// POST /api/profile/avatar  (multipart: field "file")
export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image uploaded');

  removeLocalFile(req.user.profile.avatarUrl); // clean up previous avatar
  req.user.profile.avatarUrl = publicUrl('avatar', req.file.filename);
  await req.user.save();

  return sendSuccess(res, {
    message: 'Profile photo updated',
    data: { avatarUrl: req.user.profile.avatarUrl, user: req.user.toSafeJSON() },
  });
});

// POST /api/profile/resume  (multipart: field "file")
export const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No resume uploaded');

  removeLocalFile(req.user.profile.resumeUrl);
  req.user.profile.resumeUrl = publicUrl('resume', req.file.filename);
  await req.user.save();

  // Note: parsing / resume-intelligence happens in Phase 3 (Django service).
  return sendSuccess(res, {
    message: 'Resume uploaded',
    data: { resumeUrl: req.user.profile.resumeUrl, user: req.user.toSafeJSON() },
  });
});

// PATCH /api/profile/password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // req.user was loaded without the password field; re-fetch with it.
  const user = await req.user.constructor.findById(req.user._id).select('+password');
  const ok = await user.comparePassword(currentPassword);
  if (!ok) throw ApiError.badRequest('Current password is incorrect');

  user.password = newPassword; // hashed by pre-save hook
  await user.save();

  return sendSuccess(res, { message: 'Password changed successfully' });
});
