import { Resume } from '../models/Resume.js';
import { aiService } from '../services/ai.service.js';
import { buildPathScore, collectStudentSkills } from '../services/pathScore.service.js';
import { getMarketSalaryForRole, getMarketDataForRole } from '../services/jobMarket.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

function profilePayload(user) {
  const profile = user.profile || {};
  return {
    college: profile.college,
    branch: profile.branch,
    semester: profile.semester,
    dreamRole: profile.dreamRole,
    skills: profile.skills || [],
    resumeUrl: profile.resumeUrl,
  };
}

function resumePayload(resume) {
  if (!resume) return null;
  return {
    fileUrl: resume.fileUrl,
    healthScore: resume.healthScore,
    skills: resume.skills || [],
    projects: resume.projects || [],
    education: resume.education || [],
    experience: resume.experience || [],
    certifications: resume.certifications || [],
  };
}

// GET /api/path-score
export const getPathScore = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  const pathScore = buildPathScore(req.user, resume);
  const currentSkills = collectStudentSkills(req.user, resume);

  try {
    const payload = {
      skills: resume?.skills || [],
      education: resume?.education || [],
      projects: resume?.projects || [],
      experience: resume?.experience || [],
      certifications: resume?.certifications || [],
      contact: resume?.contact || {},
      healthScore: resume?.healthScore || 0,
      wordCount: resume?.wordCount || 0,
      rawText: '',
      profile: {
        college: req.user.profile?.college || '',
        branch: req.user.profile?.branch || '',
        semester: req.user.profile?.semester || null,
        dreamRole: req.user.profile?.dreamRole || '',
        skills: req.user.profile?.skills || [],
        resumeUrl: req.user.profile?.resumeUrl || '',
      },
      currentSkills,
      targetRole: req.user.profile?.dreamRole || '',
    };

    // LEGACY — Django Python ML pipeline (kept for academic model demonstration).
    // These models (CatBoost, XGBoost) were trained on synthetic student data and
    // provide feature-engineered scoring. The main UI now uses Gemini AI insights
    // instead, but this pipeline remains active for professor demo purposes.
    const mlResponse = await aiService.predict(payload); /* LEGACY — model demo */
    if (mlResponse?.data) {
      const mlData = mlResponse.data;
      // Store ML predictions as supplementary data without overwriting
      // the factor-based score. The factor bars must always match the
      // displayed total — overwriting score without recalculating factors
      // caused visual contradictions on the dashboard.
      pathScore.predictions = mlData;

      // Use ML readiness level/summary if it provides one, but keep
      // the factor-derived score as the canonical number.
      if (mlData.careerReadiness?.level) {
        pathScore.readiness = {
          ...pathScore.readiness,
          mlLevel: mlData.careerReadiness.level,
          mlSummary: mlData.careerReadiness.summary,
        };
      }
      if (mlData.peerBenchmark && !mlData.peerBenchmark.isFallback) {
        pathScore.peerBenchmark = mlData.peerBenchmark;
      }
      if (mlData.recommendations) {
        pathScore.recommendations = mlData.recommendations;
      }
    }
  } catch (err) {
    console.error('Error fetching ML predictions:', err);
    // Keep fallback pathScore available if Django AI service is down
  }

  // Defensive: ensure `predictions.explanations` exists so the frontend
  // can render the SHAP/XAI section even when the ML service fails or
  // returns incomplete data.
  pathScore.predictions = pathScore.predictions || {};
  pathScore.predictions.explanations = pathScore.predictions.explanations || {
    topPositive: [],
    topNegative: [],
    shapRaw: [],
  };

  // Fetch live market salary range for the user's dream role.
  let marketSalary = { available: false };
  let blendedBenchmark = { available: false };
  try {
    const dreamRole = req.user.profile?.dreamRole;
    if (dreamRole) {
      marketSalary = await getMarketSalaryForRole(dreamRole);
      
      const marketData = await getMarketDataForRole(dreamRole);
      if (marketData && marketData.available && marketData.skills?.length > 0) {
        const topMarketSkills = marketData.skills.slice(0, 10);
        const studentSkillsLower = new Set(currentSkills.map(s => String(s).toLowerCase()));
        
        const skillMatches = topMarketSkills.map(s => ({
          skill: s.skill,
          demand: s.frequency,
          matched: studentSkillsLower.has(s.skill.toLowerCase())
        }));
        
        const matchedCount = skillMatches.filter(s => s.matched).length;
        const matchRate = Math.round((matchedCount / Math.max(1, topMarketSkills.length)) * 100);
        const avgMarketDemand = Math.round(
          topMarketSkills.reduce((sum, s) => sum + s.frequency, 0) / Math.max(1, topMarketSkills.length)
        );

        blendedBenchmark = {
          available: true,
          matchRate,
          avgMarketDemand,
          skills: skillMatches,
          sampleSize: marketData.sampleSize,
          lastUpdated: marketData.lastUpdated
        };
      }
    }
  } catch (err) {
    console.error('Error fetching market salary/data:', err);
  }

  return sendSuccess(res, { data: { pathScore, marketSalary, blendedBenchmark } });
});

