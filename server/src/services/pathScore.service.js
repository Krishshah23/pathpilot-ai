/**
 * services/pathScore.service.js — Path Score Calculation Service
 *
 * PATH SCORE FORMULA & WEIGHTING:
 * Path Score (0 to 100) measures a candidate's holistic readiness for their dream role.
 * It is calculated across 5 weighted components:
 *
 * 1. RESUME QUALITY (25% weight, max 25 pts):
 *    - Derived from `resume.healthScore` (0-100 scale from Django parser).
 *    - A high health score alone is not enough — depth matters.
 *
 * 2. SKILLS DEPTH (20% weight, max 20 pts):
 *    - Counts unique skills. Saturation cap raised to 20 skills for max points.
 *    - Linear from 0-20 skills; 10 skills = 10 pts (50%), not a full score.
 *
 * 3. PROJECTS PORTFOLIO (20% weight, max 20 pts):
 *    - Counts parsed projects. Saturation raised to 5 projects for max points.
 *    - 3 projects = 12 pts (60%), not a full score.
 *
 * 4. EXPERIENCE & DEPTH (20% weight, max 20 pts):
 *    - Counts internship/work experience entries from resume.
 *    - Applies a realistic semester-based ceiling: early semesters cap max attainable score.
 *    - Sem 1-3 cap: 40% of experience factor. Sem 4-6: 70%. Sem 7+: 100%.
 *
 * 5. PROFILE COMPLETENESS (15% weight, max 15 pts):
 *    - Evaluates: Target Role set, Skills added, Resume uploaded, College/Branch set.
 *
 * READINESS STAGES:
 * - 85 - 100: 'Career-ready'
 * - 70 - 84:  'Interview-ready foundation'
 * - 50 - 69:  'Building momentum'
 * - 1 - 49:   'Needs foundation'
 * - 0:        'Unscored'
 *
 * DESIGN PRINCIPLE:
 * A 4th-semester student with 3-4 good projects and 10 skills should score
 * in the 45-60 range — 'Building momentum' — not 100. Scores above 85
 * should require meaningful work experience + 5+ projects + 15+ skills.
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
  const experience = resume?.experience || [];

  // Semester-based experience ceiling — early students haven't had time to
  // accumulate real work experience; cap prevents inflated scores.
  const semester = Number(profile.semester) || 0;
  let experienceCap = 1.0;
  if (semester >= 1 && semester <= 3) experienceCap = 0.35;
  else if (semester >= 4 && semester <= 6) experienceCap = 0.65;
  else if (semester >= 7) experienceCap = 1.0;

  const profileChecks = [
    { label: 'Dream role', complete: Boolean(profile.dreamRole) },
    { label: 'Skills added', complete: skills.length >= 3 },
    { label: 'Resume uploaded', complete: Boolean(profile.resumeUrl || resume?.fileUrl) },
    { label: 'College & Branch', complete: Boolean(profile.college && profile.branch) },
  ];
  const completedProfile = profileChecks.filter((item) => item.complete).length;

  // Raw experience score: each entry worth 5 pts, max 20 pts at 4 entries
  // Then apply semester ceiling so early-stage students can't max it out
  const rawExperienceScore = Math.min(experience.length, 4) / 4;
  const experienceScore = rawExperienceScore * experienceCap * 20;

  const factors = [
    factor({
      key: 'resumeQuality',
      label: 'Resume Quality',
      // Max 25 pts — resume health alone is not enough for a high total score
      score: ((resume?.healthScore || 0) / 100) * 25,
      max: 25,
      detail: resume ? `${resume.healthScore || 0}/100 resume health` : 'No analyzed resume yet',
      tip: 'A strong resume covers all sections: contact, skills, projects, and experience.',
    }),
    factor({
      key: 'skills',
      label: 'Skills Depth',
      // Max 20 pts — saturation at 20 skills (10 skills = 50%, not full score)
      score: (Math.min(skills.length, 20) / 20) * 20,
      max: 20,
      detail: `${skills.length} unique skills detected (20 needed for full score)`,
      tip: 'Aim for 15-20 diverse, role-relevant skills across your profile and resume.',
    }),
    factor({
      key: 'projects',
      label: 'Projects Portfolio',
      // Max 20 pts — saturation at 5 projects (3 projects = 60%, not full score)
      score: (Math.min(projects.length, 5) / 5) * 20,
      max: 20,
      detail: `${projects.length} project${projects.length === 1 ? '' : 's'} detected (5 needed for full score)`,
      tip: 'Build 4-5 projects with clear descriptions, tech stack, and impact metrics.',
    }),
    factor({
      key: 'experience',
      label: 'Experience & Depth',
      // Max 20 pts — semester-capped; early students realistically score lower
      score: experienceScore,
      max: 20,
      detail: experience.length > 0
        ? `${experience.length} experience entr${experience.length === 1 ? 'y' : 'ies'} detected`
        : semester && semester <= 4 ? `Sem ${semester} — internships will boost this significantly` : 'No experience entries detected',
      tip: semester <= 6
        ? 'Internships, part-time roles, or freelance work are the fastest way to boost this factor.'
        : 'Add work experience entries with clear role, company, and impact details.',
    }),
    factor({
      key: 'profileCompletion',
      label: 'Profile Completeness',
      // Max 15 pts
      score: (completedProfile / profileChecks.length) * 15,
      max: 15,
      detail: `${completedProfile}/${profileChecks.length} profile signals complete`,
      tip: 'Set your dream role, add skills, upload a resume, and fill in college details.',
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
