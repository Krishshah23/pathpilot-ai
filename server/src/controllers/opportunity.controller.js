import { Opportunity, OPPORTUNITY_STAGES } from '../models/Opportunity.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/opportunities
 * List all opportunities for the authenticated user, newest first.
 */
export const list = asyncHandler(async (req, res) => {
  const opportunities = await Opportunity.find({ user: req.user._id }).sort({
    updatedAt: -1,
  });
  sendSuccess(res, { data: { opportunities } });
});

/**
 * GET /api/opportunities/stats
 * Aggregate counts per stage for the authenticated user.
 */
export const stats = asyncHandler(async (req, res) => {
  const pipeline = [
    { $match: { user: req.user._id } },
    { $group: { _id: '$stage', count: { $sum: 1 } } },
  ];
  const raw = await Opportunity.aggregate(pipeline);

  // Build a map with every stage present (default 0).
  const byStage = {};
  for (const s of OPPORTUNITY_STAGES) byStage[s] = 0;
  for (const r of raw) byStage[r._id] = r.count;

  const total = Object.values(byStage).reduce((a, b) => a + b, 0);

  sendSuccess(res, { data: { total, byStage } });
});

/**
 * POST /api/opportunities
 * Create a new opportunity. First timeline entry is auto-pushed.
 */
export const create = asyncHandler(async (req, res) => {
  const { company, role, stage, url, notes, salary, location } = req.body;

  if (!company || !role) {
    throw ApiError.badRequest('Company and role are required');
  }

  const initialStage = OPPORTUNITY_STAGES.includes(stage) ? stage : 'wishlist';

  const opp = await Opportunity.create({
    user: req.user._id,
    company,
    role,
    stage: initialStage,
    url: url || '',
    notes: notes || '',
    salary: salary || '',
    location: location || '',
    appliedAt: initialStage === 'applied' ? new Date() : null,
    timeline: [{ stage: initialStage, date: new Date() }],
  });

  sendSuccess(res, { statusCode: 201, message: 'Opportunity created', data: { opportunity: opp } });
});

/**
 * PATCH /api/opportunities/:id
 * Update an opportunity. If the stage changed, push a timeline entry.
 */
export const update = asyncHandler(async (req, res) => {
  const opp = await Opportunity.findOne({ _id: req.params.id, user: req.user._id });
  if (!opp) throw ApiError.notFound('Opportunity not found');

  const { company, role, stage, url, notes, salary, location } = req.body;

  if (company !== undefined) opp.company = company;
  if (role !== undefined) opp.role = role;
  if (url !== undefined) opp.url = url;
  if (notes !== undefined) opp.notes = notes;
  if (salary !== undefined) opp.salary = salary;
  if (location !== undefined) opp.location = location;

  // Stage transition — record in timeline.
  if (stage && stage !== opp.stage) {
    if (!OPPORTUNITY_STAGES.includes(stage)) {
      throw ApiError.badRequest(`Invalid stage: ${stage}`);
    }
    opp.stage = stage;
    opp.timeline.push({ stage, date: new Date(), note: req.body.timelineNote || '' });

    // Auto-set appliedAt on first transition to 'applied'.
    if (stage === 'applied' && !opp.appliedAt) {
      opp.appliedAt = new Date();
    }
  }

  await opp.save();
  sendSuccess(res, { message: 'Opportunity updated', data: { opportunity: opp } });
});

/**
 * DELETE /api/opportunities/:id
 * Remove an opportunity belonging to the authenticated user.
 */
export const remove = asyncHandler(async (req, res) => {
  const opp = await Opportunity.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!opp) throw ApiError.notFound('Opportunity not found');

  sendSuccess(res, { message: 'Opportunity deleted' });
});
