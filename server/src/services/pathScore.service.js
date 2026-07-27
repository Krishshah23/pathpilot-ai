/**
 * services/pathScore.service.js — Path Score Calculation Service
 *
 * PATH SCORE FORMULA & WEIGHTING:
 * Path Score (0 to 100) measures a candidate's holistic readiness for their dream role.
 * It is calculated across 4 weighted components:
 *
 * 1. RESUME QUALITY (35% weight, max 35 pts):
 *    - Derived directly from `resume.healthScore` (0-100 scale from Django parser).
 *
 * 2. SKILLS QUANTITY & DIVERSITY (25% weight, max 25 pts):
 *    - Counts unique skills across user profile and parsed resume.
 *    - Reaches max score at 10+ relevant skills.
 *
 * 3. PROJECTS PORTFOLIO (20% weight, max 20 pts):
 *    - Counts parsed projects from resume.
 *    - Reaches max score at 3+ well-documented projects.
 *
 * 4. PROFILE COMPLETENESS (20% weight, max 20 pts):
 *    - Evaluates onboarding readiness signals: Target Role set, Skills added, Resume uploaded.
 *
 * READINESS STAGES:
 * - 85 - 100: 'Career-ready'
 * - 70 - 84:  'Interview-ready foundation'
 * - 50 - 69:  'Building momentum'
 * - 1 - 49:   'Needs foundation'
 * - 0:        'Unscored'
 */

const FACTOR_STATUS = {
  good: 'good',
  warn: 'warn',
  bad: 'bad',
};

/** Clamps a numeric value between min and max bounds. */
function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

/** Determines visual status color for a factor score. */
function statusFor(score, max) {
  if (score >= max * 0.75) return FACTOR_STATUS.good;
  if (score > 0) return FACTOR_STATUS.warn;
  return FACTOR_STATUS.bad;
}

/** Deduplicates and normalizes skills case-insensitively across multiple sources. */
function uniqueSkills(...groups) {
  const seen = new Map();
  groups
    .flat()
    .filter(Boolean)
    .map((skill) => String(skill).trim())
    .filter(Boolean)
    .forEach((skill) => {
      const key = skill.toLowerCase();
      if (!seen.has(key)) seen.set(key, skill);
    });
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/** Constructs a structured factor object with normalized score, percentage, status, and tip. */
function factor({ key, label, score, max, tip, detail }) {
  const rounded = clamp(Math.round(score * 10) / 10, 0, max);
  return {
    key,
    label,
    score: rounded,
    max,
    percent: max ? Math.round((rounded / max) * 100) : 0,
    status: statusFor(rounded, max),
    tip: rounded >= max * 0.75 ? '' : tip,
    detail,
  };
}

/** Maps a total numerical score to a readiness level badge and summary text. */
function readinessFromScore(score) {
  if (score >= 85) {
    return {
      score,
      label: 'Career-ready',
      summary: 'Strong signals across resume, skills, projects, and profile completeness.',
    };
  }
  if (score >= 70) {
    return {
      score,
      label: 'Interview-ready foundation',
      summary: 'Good foundation. A few targeted improvements can lift your readiness.',
    };
  }
  if (score >= 50) {
    return {
      score,
      label: 'Building momentum',
      summary: 'You have visible progress, but the core readiness signals need more depth.',
    };
  }
  if (score > 0) {
    return {
      score,
      label: 'Needs foundation',
      summary: 'Start with profile completeness, stronger skills, and a resume analysis.',
    };
  }
  return {
    score,
    label: 'Unscored',
    summary: 'Complete onboarding details and analyze a resume to generate a reliable score.',
  };
}

/** Merges unique skills from the user profile document and the latest resume. */
export function collectStudentSkills(user, resume) {
  return uniqueSkills(user?.profile?.skills || [], resume?.skills || []);
}

// How old the cached score can be before GET /api/path-score opportunistically refreshes it.
const CACHE_STALE_MS = 10 * 60 * 1000; // 10 minutes

/** True if the user's cached Path Score is missing or older than the staleness window. */
export function isPathScoreCacheStale(user) {
  const computedAt = user?.pathScoreCache?.computedAt;
  if (!computedAt) return true;
  return Date.now() - new Date(computedAt).getTime() > CACHE_STALE_MS;
}

/**
 * Builds the complete weighted Path Score breakdown object.
 *
 * @param {object} user - User document with profile
 * @param {object} [resume] - Latest analyzed Resume document
 * @returns {object} Path score breakdown containing score, factors array, and readiness level
 */
export function buildPathScore(user, resume) {
  const profile = user?.profile || {};
  const skills = collectStudentSkills(user, resume);
  const projects = resume?.projects || [];

  const profileChecks = [
    { label: 'Dream role', complete: Boolean(profile.dreamRole) },
    { label: 'Skills', complete: skills.length > 0 },
    { label: 'Resume', complete: Boolean(profile.resumeUrl || resume?.fileUrl) },
  ];
  const completedProfile = profileChecks.filter((item) => item.complete).length;

  const factors = [
    factor({
      key: 'resumeQuality',
      label: 'Resume Quality',
      score: ((resume?.healthScore || 0) / 100) * 35,
      max: 35,
      detail: resume ? `${resume.healthScore || 0}/100 resume health` : 'No analyzed resume yet',
      tip: 'Upload and analyze a text-based resume to improve this factor.',
    }),
    factor({
      key: 'skills',
      label: 'Skills',
      score: (Math.min(skills.length, 10) / 10) * 25,
      max: 25,
      detail: `${skills.length} unique skills detected`,
      tip: 'Add at least 8-10 role-relevant skills from your profile or resume.',
    }),
    factor({
      key: 'projects',
      label: 'Projects',
      score: (Math.min(projects.length, 3) / 3) * 20,
      max: 20,
      detail: `${projects.length} project${projects.length === 1 ? '' : 's'} detected`,
      tip: 'Show 2-3 projects with clear role-relevant impact.',
    }),
    factor({
      key: 'profileCompletion',
      label: 'Profile Completion',
      score: (completedProfile / profileChecks.length) * 20,
      max: 20,
      detail: `${completedProfile}/${profileChecks.length} profile signals complete`,
      tip: 'Complete your target role, add skills, and upload a resume.',
    }),
  ];

  const score = clamp(
    factors.reduce((sum, item) => sum + item.score, 0),
    0,
    100
  );

  const roundedScore = Math.round(score);

  return {
    score,
    label: readinessFromScore(score).label,
    summary: readinessFromScore(score).summary,
    displayScore: roundedScore,
    factors,
    readiness: readinessFromScore(score),
    skills,
    projectsCount: projects.length,
    profileCompletion: {
      completed: completedProfile,
      total: profileChecks.length,
      checks: profileChecks,
    },
    peerBenchmark: null,
    resume: resume
      ? {
          id: resume._id,
          healthScore: resume.healthScore,
          originalName: resume.originalName,
          analyzedAt: resume.createdAt,
          lowText: resume.lowText,
        }
      : null,
  };
}

/**
 * Recomputes the canonical Path Score and refreshes `user.pathScoreCache`.
 * Returns both the previous and current cached snapshot so callers can detect
 * a significant change (e.g. Smart Notifications' score-delta trigger) without
 * having to separately track history.
 *
 * @param {object} user - User document (will be mutated + saved unless persist=false)
 * @param {object} [resume] - Latest analyzed Resume document
 * @param {object} [options]
 * @param {boolean} [options.persist=true] - Whether to write the new cache to MongoDB
 * @returns {Promise<{pathScore: object, previous: object|null, current: object}>}
 */
export async function recomputePathScoreCache(user, resume, { persist = true } = {}) {
  const pathScore = buildPathScore(user, resume);

  const previous = user.pathScoreCache?.computedAt
    ? {
        score: user.pathScoreCache.score,
        displayScore: user.pathScoreCache.displayScore,
        readinessLabel: user.pathScoreCache.readinessLabel,
        computedAt: user.pathScoreCache.computedAt,
      }
    : null;

  const current = {
    score: pathScore.score,
    displayScore: pathScore.displayScore,
    readinessLabel: pathScore.readiness?.label || '',
    factors: pathScore.factors,
    computedAt: new Date(),
  };

  user.pathScoreCache = current;
  if (persist) await user.save();

  return { pathScore, previous, current };
}
