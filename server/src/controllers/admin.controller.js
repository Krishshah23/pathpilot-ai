/**
 * controllers/admin.controller.js — Admin Panel Management Controller
 *
 * ARCHITECTURAL ROLE:
 * Provides system-wide statistics, paginated user management, and cascade user deletion for platform administrators:
 * 1. `getStats`: Aggregates platform counts (users, students, admins, resumes, plans, opportunities).
 * 2. `listUsers`: Searchable, paginated user list sorted by `createdAt` desc.
 * 3. `getUser`: Detailed user breakdown with related record counts.
 * 4. `updateUser`: Updates user role (prevents self-demotion).
 * 5. `deleteUser`: Cascades deletion across `Resume`, `GrowthPlan`, `Opportunity`, and `User` collections (prevents self-deletion).
 */

import { User } from '../models/User.js';
import { Resume } from '../models/Resume.js';
import { GrowthPlan } from '../models/GrowthPlan.js';
import { Opportunity } from '../models/Opportunity.js';
import { Notification } from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildPathScore } from '../services/pathScore.service.js';
import { getPeerBenchmark } from '../services/peerBenchmark.service.js';
import { getLiveJobsDiagnosticStats } from '../services/liveJobs.service.js';

/**
 * GET /api/admin/stats
 * Platform-wide aggregate statistics for admin dashboard metrics.
 */
export const getStats = asyncHandler(async (_req, res) => {
  const [
    totalUsers,
    totalStudents,
    totalAdmins,
    verifiedUsers,
    onboardedUsers,
    totalResumes,
    totalGrowthPlans,
    totalOpportunities,
    liveJobsStats,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ isEmailVerified: true }),
    User.countDocuments({ onboardingCompleted: true }),
    Resume.countDocuments(),
    GrowthPlan.countDocuments(),
    Opportunity.countDocuments(),
    getLiveJobsDiagnosticStats(),
  ]);

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentSignups = await User.countDocuments({ createdAt: { $gte: weekAgo } });

  const oppByStage = await Opportunity.aggregate([
    { $group: { _id: '$stage', count: { $sum: 1 } } },
  ]);
  const opportunityStages = {};
  for (const item of oppByStage) opportunityStages[item._id] = item.count;

  sendSuccess(res, {
    data: {
      stats: {
        totalUsers,
        totalStudents,
        totalAdmins,
        verifiedUsers,
        onboardedUsers,
        totalResumes,
        totalGrowthPlans,
        totalOpportunities,
        recentSignups,
        opportunityStages,
        theirStack: liveJobsStats,
      },
    },
  });
});

/**
 * GET /api/admin/users
 * Paginated, searchable user listing for admin console.
 */
export const listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const filter = {};

  if (req.query.role && ['student', 'admin'].includes(req.query.role)) {
    filter.role = req.query.role;
  }

  if (req.query.search) {
    const regex = new RegExp(req.query.search, 'i');
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('name email role isEmailVerified onboardingCompleted profile.college profile.branch profile.dreamRole profile.skills createdAt lastLoginAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  sendSuccess(res, {
    data: {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

/**
 * GET /api/admin/users/:id
 * "Student Snapshot" — full detail view for a single user, admin-only.
 * Beyond raw profile fields, this reuses the same engines the student's own
 * Overview page runs (Path Score, peer benchmarking) so an admin sees the
 * platform through that student's eyes rather than a bare data dump —
 * plus their latest resume (viewable/downloadable via GridFS, see
 * resume.controller.js's serveResumeFile) and a recent activity timeline.
 */
export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password')
    .lean();

  if (!user) throw ApiError.notFound('User not found');

  const [resumeCount, latestResume, growthPlan, oppCount, recentActivity] = await Promise.all([
    Resume.countDocuments({ user: user._id }),
    Resume.findOne({ user: user._id })
      .sort({ createdAt: -1 })
      .select('fileId fileUrl originalName mimeType healthScore wordCount createdAt')
      .lean(),
    GrowthPlan.findOne({ user: user._id }).select('targetRole totalTasks totalHours').lean(),
    Opportunity.countDocuments({ user: user._id }),
    Notification.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(6)
      .select('title message type createdAt')
      .lean(),
  ]);

  const pathScore = buildPathScore(user, latestResume);
  const peerBenchmark = await getPeerBenchmark(user);

  sendSuccess(res, {
    data: {
      user,
      resume: latestResume,
      pathScore: {
        displayScore: pathScore.displayScore,
        readiness: pathScore.readiness,
        factors: pathScore.factors,
      },
      peerBenchmark,
      recentActivity,
      related: { resumeCount, growthPlan, opportunityCount: oppCount },
    },
  });
});

/**
 * PATCH /api/admin/users/:id
 * Updates user role (prevents admin self-demotion).
 */
export const updateUser = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  if (user._id.equals(req.user._id) && role !== 'admin') {
    throw ApiError.badRequest('You cannot demote yourself');
  }

  if (role && ['student', 'admin'].includes(role)) {
    user.role = role;
  }

  await user.save();
  sendSuccess(res, { message: 'User updated', data: { user: user.toSafeJSON() } });
});

/**
 * DELETE /api/admin/users/:id
 * Deletes user and cascades deletion across all associated documents.
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  if (user._id.equals(req.user._id)) {
    throw ApiError.badRequest('You cannot delete your own account');
  }

  // Cascade deletion across all user documents
  await Promise.all([
    Resume.deleteMany({ user: user._id }),
    GrowthPlan.deleteMany({ user: user._id }),
    Opportunity.deleteMany({ user: user._id }),
    User.deleteOne({ _id: user._id }),
  ]);

  sendSuccess(res, { message: 'User and related data deleted' });
});
