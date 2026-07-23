import fs from 'node:fs';
import path from 'node:path';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { publicUrl } from '../middleware/upload.middleware.js';
import { User } from '../models/User.js';
import { Resume } from '../models/Resume.js';
import { buildPathScore, collectStudentSkills } from '../services/pathScore.service.js';

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
  const { name, email, college, branch, semester, dreamRole, skills } = req.body;

  if (name !== undefined) user.name = name;
  
  if (email !== undefined && email.toLowerCase() !== user.email) {
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) throw ApiError.conflict('An account with this email already exists');
    user.email = email.toLowerCase();
    user.isEmailVerified = false;
  }

  if (college !== undefined) user.profile.college = college;
  if (branch !== undefined) user.profile.branch = branch;
  if (semester !== undefined) user.profile.semester = semester;
  if (dreamRole !== undefined && dreamRole !== user.profile.dreamRole) {
    user.profile.dreamRole = dreamRole;
    // Clear cached AI narrative on active resume so Overview page generates fresh audit narrative for new role
    Resume.findOne({ user: user._id }).sort({ createdAt: -1 }).then((r) => {
      if (r && r.aiNarrative) { r.aiNarrative = ''; r.save().catch(() => {}); }
    }).catch(() => {});
  } else if (dreamRole !== undefined) {
    user.profile.dreamRole = dreamRole;
  }
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

// GET /api/profile/public/:publicCardId
export const getPublicCard = asyncHandler(async (req, res) => {
  const { publicCardId } = req.params;

  const user = await User.findOne({ publicCardId, isPublicCardEnabled: true });
  if (!user) {
    throw ApiError.notFound('Public career profile not found or is set to private');
  }

  const resume = await Resume.findOne({ user: user._id }).sort({ createdAt: -1 });
  const pathScore = buildPathScore(user, resume);
  const skills = collectStudentSkills(user, resume);

  return sendSuccess(res, {
    data: {
      name: user.name,
      college: user.profile.college,
      branch: user.profile.branch,
      semester: user.profile.semester,
      dreamRole: user.profile.dreamRole,
      skills,
      pathScore: pathScore.displayScore ?? Math.round(pathScore.score || 0),
      readinessLabel: pathScore.readiness?.label || pathScore.label || 'Exploring',
      readinessSummary: pathScore.readiness?.summary || pathScore.summary || '',
      avatarUrl: user.profile.avatarUrl,
      factors: pathScore.factors || [],
    },
  });
});

// PATCH /api/profile/public-card
export const togglePublicCard = asyncHandler(async (req, res) => {
  const { isPublicCardEnabled } = req.body;

  if (isPublicCardEnabled === undefined) {
    throw ApiError.badRequest('isPublicCardEnabled value is required');
  }

  const user = req.user;
  user.isPublicCardEnabled = !!isPublicCardEnabled;
  await user.save();

  return sendSuccess(res, {
    message: `Public career card is now ${user.isPublicCardEnabled ? 'enabled' : 'disabled'}`,
    data: {
      isPublicCardEnabled: user.isPublicCardEnabled,
      publicCardId: user.publicCardId,
    },
  });
});
