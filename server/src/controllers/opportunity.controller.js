import { Opportunity, OPPORTUNITY_STAGES } from '../models/Opportunity.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { aiService } from '../services/ai.service.js';
import { collectStudentSkills } from '../services/pathScore.service.js';
import { Resume } from '../models/Resume.js';

function getProfilePayload(user, latestResume) {
  const profile = user.profile || {};
  const skills = collectStudentSkills(user);
  
  return {
    education: profile.education ?? 1,
    cgpa: profile.cgpa ?? 0,
    experience: profile.experience ?? 0,
    projects: profile.projects?.length ?? 0,
    internships: profile.internships ?? 0,
    skills_count: skills.length ?? 0,
    frontend_skills: skills.filter((s) => ['React', 'Vue', 'Angular', 'HTML', 'CSS', 'JavaScript', 'TypeScript'].includes(s)).length ?? 0,
    backend_skills: skills.filter((s) => ['Node.js', 'Express', 'Django', 'Flask', 'Java', 'Python'].includes(s)).length ?? 0,
    database_skills: skills.filter((s) => ['MongoDB', 'PostgreSQL', 'MySQL', 'SQL', 'Redis'].includes(s)).length ?? 0,
    cloud_skills: skills.filter((s) => ['AWS', 'Docker', 'Kubernetes', 'GCP', 'Azure'].includes(s)).length ?? 0,
    ml_skills: skills.filter((s) => ['Python', 'TensorFlow', 'PyTorch', 'scikit-learn', 'Machine Learning'].includes(s)).length ?? 0,
    certifications: profile.certifications?.length ?? 0,
    has_github: profile.githubUrl ? 1 : 0,
    has_linkedin: profile.linkedinUrl ? 1 : 0,
    resume_score: latestResume ? latestResume.healthScore : 0,
  };
}

async function calculateOpportunityFit(user, targetRole) {
  try {
    const latestResume = await Resume.findOne({ user: user._id }).sort({ createdAt: -1 });
    const currentSkills = collectStudentSkills(user);
    const features = getProfilePayload(user, latestResume);
    
    const response = await aiService.predict({
      features,
      current_skills: currentSkills,
      target_role: targetRole,
    });
    
    if (response && response.data) {
      const data = response.data;
      
      const roleFit = data.recommendedRole?.roleFitScore ?? 0.0;
      const atsPass = data.atsProbability ?? 50.0;
      const interviewSuccess = data.interviewProbability ?? 50.0;
      
      const score = Math.round((roleFit * 0.3) + (atsPass * 0.35) + (interviewSuccess * 0.35));
      
      const confScore = Math.round(
        ((data.recommendedRole?.confidenceTag?.score ?? 50) +
         (data.atsConfidence?.score ?? 50) +
         (data.interviewConfidence?.score ?? 50)) / 3
      );
      
      let tier = 'moderate';
      if (confScore >= 70) tier = 'high';
      else if (confScore < 40) tier = 'low';
      
      return {
        score: Math.max(10, Math.min(100, score)),
        roleFit: Math.round(roleFit),
        atsPass: Math.round(atsPass),
        interviewSuccess: Math.round(interviewSuccess),
        confidence: {
          tier,
          score: confScore,
          reason: `Based on combined diagnostics for ${targetRole}`,
        },
      };
    }
  } catch (err) {
    console.error('Failed to calculate opportunity fit:', err.message);
  }
  
  return {
    score: 50,
    roleFit: 50,
    atsPass: 50,
    interviewSuccess: 50,
    confidence: {
      tier: 'low',
      score: 30,
      reason: 'AI service unavailable — using basic profile metrics',
    },
  };
}

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
  const fitScore = await calculateOpportunityFit(req.user, role);

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
    fitScore,
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
  const roleChanged = role !== undefined && role !== opp.role;

  if (company !== undefined) opp.company = company;
  if (role !== undefined) opp.role = role;
  if (url !== undefined) opp.url = url;
  if (notes !== undefined) opp.notes = notes;
  if (salary !== undefined) opp.salary = salary;
  if (location !== undefined) opp.location = location;

  if (roleChanged || !opp.fitScore || opp.fitScore.score === 0) {
    opp.fitScore = await calculateOpportunityFit(req.user, opp.role);
  }

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
