/**
 * controllers/profile.controller.js — Candidate Profile & Public Card Controller
 *
 * ARCHITECTURAL ROLE:
 * Manages candidate profile updates, password modifications, avatar/resume uploads,
 * and shareable public career card state:
 * 1. `updateProfile`: Updates profile fields. Invalidates `aiNarrative` on active resume if `dreamRole` changes.
 * 2. `uploadAvatar` / `uploadResume`: Saves file uploaded via Multer and cleans up previous file on disk (`removeLocalFile`).
 * 3. `getPublicCard`: Unauthenticated public endpoint returning card data if `isPublicCardEnabled` is true.
 * 4. `togglePublicCard`: Enables/disables public career card sharing.
 */

import fs from 'node:fs';
import path from 'node:path';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { publicUrl } from '../middleware/upload.middleware.js';
import { uploadBufferToGridFS } from '../config/gridfs.js';
import { User } from '../models/User.js';
import { Resume } from '../models/Resume.js';
import { buildPathScore, collectStudentSkills, recomputePathScoreCache } from '../services/pathScore.service.js';

/** Removes a previously stored local file on disk. */
function removeLocalFile(publicPath) {
  if (!publicPath || !publicPath.startsWith('/uploads/')) return;
  const abs = path.join(process.cwd(), publicPath.replace(/^\//, ''));
  fs.promises.unlink(abs).catch(() => {});
}

/**
 * GET /api/profile
 * Returns authenticated candidate profile payload.
 */
export const getProfile = asyncHandler(async (req, res) => {
  return sendSuccess(res, { data: { user: req.user.toSafeJSON() } });
});

/**
 * PATCH /api/profile
 * Updates candidate profile data. Invalidates resume `aiNarrative` if `dreamRole` changes.
 */
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
    // Clear cached AI narrative on active resume so Overview page generates fresh narrative for new role
    Resume.findOne({ user: user._id })
      .sort({ createdAt: -1 })
      .then((r) => {
        if (r && r.aiNarrative) {
          r.aiNarrative = '';
          r.save().catch(() => {});
        }
      })
      .catch(() => {});
  } else if (dreamRole !== undefined) {
    user.profile.dreamRole = dreamRole;
  }
  if (skills !== undefined) user.profile.skills = skills;

  await user.save();

  // Keep the cached Path Score warm — dreamRole/skills changes affect the score,
  // and Peer Benchmarking / Smart Notifications both read from this cache.
  try {
    const latestResume = await Resume.findOne({ user: user._id }).sort({ createdAt: -1 });
    await recomputePathScoreCache(user, latestResume);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to refresh Path Score cache after profile update:', err);
  }

  return sendSuccess(res, {
    message: 'Profile updated',
    data: { user: user.toSafeJSON() },
  });
});

/**
 * POST /api/profile/avatar
 * Uploads candidate avatar image and removes previous image.
 */
export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image uploaded');

  removeLocalFile(req.user.profile.avatarUrl);
  req.user.profile.avatarUrl = publicUrl('avatar', req.file.filename);
  await req.user.save();

  return sendSuccess(res, {
    message: 'Profile photo updated',
    data: { avatarUrl: req.user.profile.avatarUrl, user: req.user.toSafeJSON() },
  });
});

/**
 * POST /api/profile/resume
 * Updates active resume URL pointer. The file itself is persisted to MongoDB
 * GridFS (config/gridfs.js) — never disk, since Render's free-tier disk is
 * ephemeral. `removeLocalFile` only matters for pre-migration records whose
 * `resumeUrl` still points at a legacy on-disk path; new GridFS-backed URLs
 * are simply left alone (each upload creates its own Resume history entry).
 */
export const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No resume uploaded');

  removeLocalFile(req.user.profile.resumeUrl);

  const fileId = await uploadBufferToGridFS(req.file.buffer, req.file.originalname, {
    userId: req.user._id.toString(),
    mimeType: req.file.mimetype,
  });
  const newUrl = `/api/resume/file/${fileId}`;

  req.user.profile.resumeUrl = newUrl;
  await req.user.save();

  await Resume.create({
    user: req.user._id,
    fileUrl: newUrl,
    fileId,
    mimeType: req.file.mimetype || 'application/pdf',
    originalName: req.file.originalname,
  });

  return sendSuccess(res, {
    message: 'Resume uploaded',
    data: { resumeUrl: req.user.profile.resumeUrl, user: req.user.toSafeJSON() },
  });
});

/**
 * PATCH /api/profile/password
 * Changes candidate password after verifying current password hash.
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await req.user.constructor.findById(req.user._id).select('+password');
  const ok = await user.comparePassword(currentPassword);
  if (!ok) throw ApiError.badRequest('Current password is incorrect');

  user.password = newPassword;
  await user.save();

  return sendSuccess(res, { message: 'Password changed successfully' });
});

/**
 * GET /api/profile/public/:publicCardId
 * Unauthenticated public endpoint returning candidate career card if sharing is enabled.
 */
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

/**
 * PATCH /api/profile/public-card
 * Toggles public card shareability on or off.
 */
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
