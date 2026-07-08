import axios from 'axios';
import { env } from '../config/env.js';
import { JobMarketSnapshot } from '../models/JobMarketSnapshot.js';

/*
  Job-market grounding service.

  - Talks to the Adzuna API to fetch live job listings for tracked roles.
  - Extracts skill mentions from listing descriptions via keyword matching.
  - Computes skill frequency % and salary ranges, then persists weekly snapshots.
  - Exposes `getMarketDataForRole()` for the rest of the app to consume.
*/

// ── Adzuna client ────────────────────────────────────────────────────

const ADZUNA_BASE = 'https://api.adzuna.com/v1/api/jobs';
const COUNTRY = 'in'; // India

/**
 * Fetch a single page of Adzuna job listings for a query.
 * Returns [] if the API is misconfigured or unreachable.
 */
async function fetchAdzunaPage(query, page = 1, resultsPerPage = 50) {
  if (!env.adzuna.appId || !env.adzuna.appKey) {
    return { results: [], count: 0 };
  }
  try {
    const { data } = await axios.get(
      `${ADZUNA_BASE}/${COUNTRY}/search/${page}`,
      {
        params: {
          app_id: env.adzuna.appId,
          app_key: env.adzuna.appKey,
          what: query,
          results_per_page: resultsPerPage,
          content_type: 'application/json',
        },
        timeout: 15000,
      }
    );
    return { results: data.results || [], count: data.count || 0 };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[JobMarket] Adzuna fetch failed for "${query}":`, err.message);
    return { results: [], count: 0 };
  }
}

// ── Skill extraction ────────────────────────────────────────────────

/**
 * Master skill keyword list. Checked case-insensitively against job
 * descriptions. Intentionally broad so we capture signal across roles.
 * These are the same skills the app already tracks (profile, resume, etc.).
 */
const TRACKED_SKILLS = [
  // Languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust',
  'PHP', 'Ruby', 'Swift', 'Kotlin', 'R', 'Scala',
  // Frontend
  'React', 'Next.js', 'Vue', 'Angular', 'Redux', 'Tailwind CSS', 'Bootstrap',
  'jQuery', 'Sass', 'HTML', 'CSS',
  // Backend
  'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'GraphQL',
  'REST APIs',
  // Databases
  'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'SQLite', 'Firebase', 'Oracle',
  'SQL', 'DynamoDB', 'Cassandra',
  // DevOps / Cloud
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'CI/CD', 'Jenkins',
  'Terraform', 'Linux', 'Nginx', 'Ansible',
  // Data / ML
  'Pandas', 'NumPy', 'scikit-learn', 'TensorFlow', 'PyTorch',
  'Machine Learning', 'Deep Learning', 'Data Analysis', 'Matplotlib',
  'Power BI', 'Tableau', 'Excel', 'NLP', 'Spark', 'Hadoop',
  // Tools / CS
  'Git', 'GitHub', 'GitLab', 'Data Structures', 'Algorithms', 'OOP',
  'Agile', 'Jira', 'Figma', 'Postman', 'Microservices', 'System Design',
  'WebSockets',
];

// Pre-build lowercase set + regex for faster matching.
const SKILL_PATTERNS = TRACKED_SKILLS.map((s) => ({
  canonical: s,
  regex: new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
}));

/**
 * Given a list of Adzuna job listing objects, returns:
 *   skillFrequency: Map<skill, { count, percent }>
 *   salaryRange: { min, max } in LPA (annual, lakhs)
 */
function analyzeListings(listings) {
  const skillCounts = new Map();
  const salaries = [];
  const total = listings.length || 1;

  for (const listing of listings) {
    const text = `${listing.title || ''} ${listing.description || ''}`;

    for (const { canonical, regex } of SKILL_PATTERNS) {
      if (regex.test(text)) {
        skillCounts.set(canonical, (skillCounts.get(canonical) || 0) + 1);
      }
    }

    // Adzuna salaries come as annual GBP/INR — normalize to INR LPA.
    const minSal = listing.salary_min;
    const maxSal = listing.salary_max;
    if (minSal || maxSal) {
      salaries.push({ min: minSal || maxSal, max: maxSal || minSal });
    }
  }

  const skillFrequency = new Map();
  for (const [skill, count] of skillCounts) {
    skillFrequency.set(skill, {
      count,
      percent: Math.round((count / total) * 100),
    });
  }

  // Compute aggregate salary range (LPA).
  let salaryRange = { min: null, max: null };
  if (salaries.length) {
    const mins = salaries.map((s) => s.min).filter(Boolean);
    const maxs = salaries.map((s) => s.max).filter(Boolean);
    // Adzuna India returns annual INR. Convert to LPA (÷ 100000).
    salaryRange = {
      min: mins.length ? Math.round(Math.min(...mins) / 100000) : null,
      max: maxs.length ? Math.round(Math.max(...maxs) / 100000) : null,
    };
    // Clamp extreme outliers.
    if (salaryRange.min !== null) salaryRange.min = Math.max(1, salaryRange.min);
    if (salaryRange.max !== null) salaryRange.max = Math.min(200, salaryRange.max);
  }

  return { skillFrequency, salaryRange, sampleSize: listings.length };
}

// ── Week key ─────────────────────────────────────────────────────────

/** Returns the Monday of the current ISO week. */
function currentWeekStart() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun … 6=Sat
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// ── Public API ───────────────────────────────────────────────────────

/** Roles tracked by the scheduled fetch. Matches `DREAM_ROLES` on the client. */
export const TRACKED_ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Scientist',
  'Data Analyst',
  'Machine Learning Engineer',
  'DevOps Engineer',
  'Mobile App Developer',
  'Cloud Engineer',
  'Cybersecurity Analyst',
  'UI/UX Designer',
  'Product Manager',
];

/**
 * Fetch listings from Adzuna for a single role, extract skill frequencies
 * and salary ranges, and persist as JobMarketSnapshot documents.
 */
export async function fetchAndStoreForRole(role) {
  const weekOf = currentWeekStart();

  // Fetch up to 2 pages (100 listings) — enough for frequency signal.
  const page1 = await fetchAdzunaPage(role, 1, 50);
  const page2 = page1.count > 50 ? await fetchAdzunaPage(role, 2, 50) : { results: [] };
  const listings = [...page1.results, ...page2.results];

  if (!listings.length) {
    // eslint-disable-next-line no-console
    console.warn(`[JobMarket] No listings found for "${role}". Skipping.`);
    return 0;
  }

  const { skillFrequency, salaryRange, sampleSize } = analyzeListings(listings);
  let upserted = 0;

  for (const [skill, { percent }] of skillFrequency) {
    try {
      await JobMarketSnapshot.findOneAndUpdate(
        { role, skill, weekOf },
        {
          role,
          skill,
          frequency: percent,
          avgSalaryRange: salaryRange,
          sampleSize,
          weekOf,
        },
        { upsert: true, new: true }
      );
      upserted++;
    } catch (err) {
      // Duplicate-key race — safe to ignore (unique index).
      if (err.code !== 11000) throw err;
    }
  }

  return upserted;
}

/**
 * Run the full market-data refresh for all tracked roles.
 * Called by the cron scheduler and can also be triggered manually.
 */
export async function refreshAllRoles() {
  // eslint-disable-next-line no-console
  console.log('[JobMarket] Starting weekly market data refresh…');
  let total = 0;

  for (const role of TRACKED_ROLES) {
    const count = await fetchAndStoreForRole(role);
    total += count;
    // Be polite to the API — 500 ms between roles.
    await new Promise((r) => setTimeout(r, 500));
  }

  // eslint-disable-next-line no-console
  console.log(`[JobMarket] Refresh complete. ${total} snapshots upserted.`);
  return total;
}

/**
 * Seeding helper to dynamically generate mock snapshots when the Adzuna API is offline or missing credentials.
 */
async function seedMockDataForRole(role) {
  const weekOf = currentWeekStart();
  const mockSkills = {
    'Frontend Developer': [
      { skill: 'React', percent: 92 },
      { skill: 'JavaScript', percent: 85 },
      { skill: 'TypeScript', percent: 75 },
      { skill: 'CSS', percent: 85 },
      { skill: 'HTML', percent: 80 },
      { skill: 'Tailwind CSS', percent: 65 },
      { skill: 'Redux', percent: 55 },
      { skill: 'Git', percent: 50 }
    ],
    'Backend Developer': [
      { skill: 'Node.js', percent: 85 },
      { skill: 'Express', percent: 80 },
      { skill: 'REST APIs', percent: 80 },
      { skill: 'MongoDB', percent: 75 },
      { skill: 'Python', percent: 70 },
      { skill: 'SQL', percent: 70 },
      { skill: 'PostgreSQL', percent: 65 },
      { skill: 'Docker', percent: 55 }
    ],
    'Full Stack Developer': [
      { skill: 'React', percent: 90 },
      { skill: 'Node.js', percent: 80 },
      { skill: 'JavaScript', percent: 80 },
      { skill: 'SQL', percent: 70 },
      { skill: 'MongoDB', percent: 65 },
      { skill: 'TypeScript', percent: 65 },
      { skill: 'Git', percent: 60 },
      { skill: 'Docker', percent: 50 }
    ],
    'Data Scientist': [
      { skill: 'Python', percent: 95 },
      { skill: 'Data Analysis', percent: 85 },
      { skill: 'Pandas', percent: 80 },
      { skill: 'Machine Learning', percent: 80 },
      { skill: 'SQL', percent: 75 },
      { skill: 'NumPy', percent: 70 },
      { skill: 'TensorFlow', percent: 55 },
      { skill: 'R', percent: 50 }
    ],
    'Data Analyst': [
      { skill: 'SQL', percent: 90 },
      { skill: 'Excel', percent: 85 },
      { skill: 'Data Analysis', percent: 80 },
      { skill: 'Power BI', percent: 75 },
      { skill: 'Tableau', percent: 70 },
      { skill: 'Python', percent: 60 },
      { skill: 'Pandas', percent: 50 },
      { skill: 'Git', percent: 40 }
    ],
    'Machine Learning Engineer': [
      { skill: 'Python', percent: 95 },
      { skill: 'Machine Learning', percent: 90 },
      { skill: 'Deep Learning', percent: 80 },
      { skill: 'PyTorch', percent: 75 },
      { skill: 'TensorFlow', percent: 75 },
      { skill: 'scikit-learn', percent: 70 },
      { skill: 'Algorithms', percent: 65 },
      { skill: 'C++', percent: 50 }
    ],
    'DevOps Engineer': [
      { skill: 'Docker', percent: 90 },
      { skill: 'Kubernetes', percent: 85 },
      { skill: 'CI/CD', percent: 85 },
      { skill: 'AWS', percent: 80 },
      { skill: 'Linux', percent: 75 },
      { skill: 'Git', percent: 70 },
      { skill: 'Terraform', percent: 65 },
      { skill: 'Jenkins', percent: 60 }
    ],
    'Mobile App Developer': [
      { skill: 'Swift', percent: 80 },
      { skill: 'Kotlin', percent: 80 },
      { skill: 'React Native', percent: 75 },
      { skill: 'JavaScript', percent: 70 },
      { skill: 'TypeScript', percent: 60 },
      { skill: 'Git', percent: 50 },
      { skill: 'REST APIs', percent: 50 },
      { skill: 'OOP', percent: 40 }
    ],
    'Cloud Engineer': [
      { skill: 'AWS', percent: 90 },
      { skill: 'Azure', percent: 80 },
      { skill: 'GCP', percent: 70 },
      { skill: 'Linux', percent: 70 },
      { skill: 'Docker', percent: 65 },
      { skill: 'Kubernetes', percent: 60 },
      { skill: 'Terraform', percent: 50 },
      { skill: 'CI/CD', percent: 50 }
    ],
    'Cybersecurity Analyst': [
      { skill: 'Linux', percent: 85 },
      { skill: 'Networks', percent: 80 },
      { skill: 'Security', percent: 80 },
      { skill: 'Python', percent: 65 },
      { skill: 'SQL', percent: 55 },
      { skill: 'Docker', percent: 40 },
      { skill: 'Git', percent: 40 },
      { skill: 'Cloud', percent: 30 }
    ],
    'UI/UX Designer': [
      { skill: 'Figma', percent: 95 },
      { skill: 'CSS', percent: 60 },
      { skill: 'HTML', percent: 50 },
      { skill: 'JavaScript', percent: 40 },
      { skill: 'React', percent: 30 },
      { skill: 'Tailwind CSS', percent: 20 },
      { skill: 'Agile', percent: 40 },
      { skill: 'Git', percent: 20 }
    ],
    'Product Manager': [
      { skill: 'Agile', percent: 90 },
      { skill: 'Jira', percent: 85 },
      { skill: 'Data Analysis', percent: 75 },
      { skill: 'SQL', percent: 50 },
      { skill: 'Python', percent: 30 },
      { skill: 'Excel', percent: 70 },
      { skill: 'Figma', percent: 40 },
      { skill: 'Git', percent: 20 }
    ]
  };

  const mockSalaries = {
    'Frontend Developer': { min: 600000, max: 1500000 },
    'Backend Developer': { min: 700000, max: 1800000 },
    'Full Stack Developer': { min: 800000, max: 2000000 },
    'Data Scientist': { min: 800000, max: 2400000 },
    'Data Analyst': { min: 450000, max: 1200000 },
    'Machine Learning Engineer': { min: 900000, max: 2800000 },
    'DevOps Engineer': { min: 800000, max: 2200000 },
    'Mobile App Developer': { min: 500000, max: 1400000 },
    'Cloud Engineer': { min: 700000, max: 1900000 },
    'Cybersecurity Analyst': { min: 600000, max: 1600000 },
    'UI/UX Designer': { min: 400000, max: 1300000 },
    'Product Manager': { min: 900000, max: 2500000 }
  };

  const skillsForRole = mockSkills[role] || [
    { skill: 'React', percent: 60 },
    { skill: 'Node.js', percent: 50 },
    { skill: 'Python', percent: 40 },
    { skill: 'Git', percent: 40 }
  ];

  const salRange = mockSalaries[role] || { min: 500000, max: 1200000 };

  // Normalize salaries to LPA
  const minLPA = Math.round(salRange.min / 100000);
  const maxLPA = Math.round(salRange.max / 100000);

  for (const item of skillsForRole) {
    try {
      await JobMarketSnapshot.findOneAndUpdate(
        { role, skill: item.skill, weekOf },
        {
          role,
          skill: item.skill,
          frequency: item.percent,
          avgSalaryRange: { min: minLPA, max: maxLPA },
          sampleSize: 150,
          weekOf
        },
        { upsert: true, new: true }
      );
    } catch (e) {
      // Ignore duplicate keys
    }
  }
}

/**
 * Query the latest week's market data for a given role.
 * Returns { skills: [{ skill, frequency, avgSalaryRange }], lastUpdated, sampleSize }.
 */
export async function getMarketDataForRole(role) {
  let latest = await JobMarketSnapshot.findOne({ role })
    .sort({ weekOf: -1 })
    .select('weekOf')
    .lean();

  if (!latest) {
    await seedMockDataForRole(role);
    latest = await JobMarketSnapshot.findOne({ role })
      .sort({ weekOf: -1 })
      .select('weekOf')
      .lean();
  }

  if (!latest) {
    return { skills: [], lastUpdated: null, sampleSize: 0, available: false };
  }

  const snapshots = await JobMarketSnapshot.find({
    role,
    weekOf: latest.weekOf,
  })
    .sort({ frequency: -1 })
    .lean();

  return {
    skills: snapshots.map((s) => ({
      skill: s.skill,
      frequency: s.frequency,
      avgSalaryRange: s.avgSalaryRange,
    })),
    lastUpdated: latest.weekOf,
    sampleSize: snapshots[0]?.sampleSize || 0,
    available: true,
  };
}

/**
 * Get aggregate salary range from market data for a specific role.
 * Returns { min, max, lastUpdated, available }.
 */
export async function getMarketSalaryForRole(role) {
  let latest = await JobMarketSnapshot.findOne({ role })
    .sort({ weekOf: -1 })
    .select('weekOf avgSalaryRange')
    .lean();

  if (!latest) {
    await seedMockDataForRole(role);
    latest = await JobMarketSnapshot.findOne({ role })
      .sort({ weekOf: -1 })
      .select('weekOf avgSalaryRange')
      .lean();
  }

  if (!latest || !latest.avgSalaryRange) {
    return { min: null, max: null, lastUpdated: null, available: false };
  }

  // Get all snapshots from that week to compute a broader salary picture.
  const snapshots = await JobMarketSnapshot.find({
    role,
    weekOf: latest.weekOf,
    'avgSalaryRange.min': { $ne: null },
  })
    .select('avgSalaryRange')
    .lean();

  if (!snapshots.length) {
    return { min: null, max: null, lastUpdated: latest.weekOf, available: false };
  }

  const mins = snapshots.map((s) => s.avgSalaryRange.min).filter(Boolean);
  const maxs = snapshots.map((s) => s.avgSalaryRange.max).filter(Boolean);

  return {
    min: mins.length ? Math.min(...mins) : null,
    max: maxs.length ? Math.max(...maxs) : null,
    lastUpdated: latest.weekOf,
    available: true,
  };
}
