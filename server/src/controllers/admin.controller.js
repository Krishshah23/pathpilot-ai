import { User } from '../models/User.js';
import { Resume } from '../models/Resume.js';
import { GrowthPlan } from '../models/GrowthPlan.js';
import { Opportunity } from '../models/Opportunity.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/admin/stats
 * Platform-wide aggregate statistics for the admin overview.
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
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ isEmailVerified: true }),
    User.countDocuments({ onboardingCompleted: true }),
    Resume.countDocuments(),
    GrowthPlan.countDocuments(),
    Opportunity.countDocuments(),
  ]);

  // Recent sign-ups (last 7 days).
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentSignups = await User.countDocuments({ createdAt: { $gte: weekAgo } });

  // Opportunity stage breakdown across all users.
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
      },
    },
  });
});

/**
 * GET /api/admin/users
 * Paginated, searchable user list.
 * Query params: page, limit, search, role
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
 * Detailed single-user view for admin.
 */
export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password')
    .lean();

  if (!user) throw ApiError.notFound('User not found');

  // Fetch related data counts.
  const [resumeCount, growthPlan, oppCount] = await Promise.all([
    Resume.countDocuments({ user: user._id }),
    GrowthPlan.findOne({ user: user._id }).select('targetRole totalTasks totalHours').lean(),
    Opportunity.countDocuments({ user: user._id }),
  ]);

  sendSuccess(res, {
    data: {
      user,
      related: { resumeCount, growthPlan, opportunityCount: oppCount },
    },
  });
});

/**
 * PATCH /api/admin/users/:id
 * Admin can update a user's role.
 */
export const updateUser = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  // Prevent admin from demoting themselves.
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
 * Remove a user and all their related data.
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  // Prevent admin from deleting themselves.
  if (user._id.equals(req.user._id)) {
    throw ApiError.badRequest('You cannot delete your own account');
  }

  // Cascade: remove related documents.
  await Promise.all([
    Resume.deleteMany({ user: user._id }),
    GrowthPlan.deleteMany({ user: user._id }),
    Opportunity.deleteMany({ user: user._id }),
    User.deleteOne({ _id: user._id }),
  ]);

  sendSuccess(res, { message: 'User and related data deleted' });
});
