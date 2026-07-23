const FACTOR_STATUS = {
  good: 'good',
  warn: 'warn',
  bad: 'bad',
};

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function statusFor(score, max) {
  if (score >= max * 0.75) return FACTOR_STATUS.good;
  if (score > 0) return FACTOR_STATUS.warn;
  return FACTOR_STATUS.bad;
}

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

export function collectStudentSkills(user, resume) {
  return uniqueSkills(user?.profile?.skills || [], resume?.skills || []);
}

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
    // Provide a rounded score for display consistency
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

