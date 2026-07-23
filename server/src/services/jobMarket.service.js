/**
 * services/jobMarket.service.js — Market Intelligence & Salary Grounding Service
 *
 * ARCHITECTURAL PURPOSE:
 * 1. ADZUNA INTEGRATION: Connects to the Adzuna REST API to query live job listings
 *    in India across 12 tracked tech roles (`TRACKED_ROLES`).
 * 2. SKILL FREQUENCY COMPUTATION: Scans job listing descriptions against `TRACKED_SKILLS`
 *    keyword regexes to compute skill frequency percentages (e.g., 85% of Full Stack jobs require React).
 * 3. SALARY AGGREGATION: Extracts salary ranges and converts raw figures into INR LPA (Lakhs Per Annum).
 * 4. DB PERSISTENCE: Upserts JobMarketSnapshot documents for weekly tracking.
 * 5. MOCK SEED FALLBACK: If Adzuna credentials are not configured or offline, automatically
 *    seeds realistic mock snapshots (`seedMockDataForRole`) so the UI never displays empty market cards.
 */

import axios from 'axios';
import { env } from '../config/env.js';
import { JobMarketSnapshot } from '../models/JobMarketSnapshot.js';

// ── Adzuna client configuration ──────────────────────────────────────────
const ADZUNA_BASE = 'https://api.adzuna.com/v1/api/jobs';
const COUNTRY = 'in'; // Search Indian job market listings

/**
 * Fetches a single page of job listings from Adzuna API.
 * @param {string} query - Job title query
 * @param {number} [page=1] - Page index
 * @param {number} [resultsPerPage=50] - Number of items per page
 * @returns {Promise<{results: Array<object>, count: number}>}
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

// Master skill keyword list checked against job descriptions
const TRACKED_SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust',
  'PHP', 'Ruby', 'Swift', 'Kotlin', 'R', 'Scala',
  'React', 'Next.js', 'Vue', 'Angular', 'Redux', 'Tailwind CSS', 'Bootstrap',
  'jQuery', 'Sass', 'HTML', 'CSS',
  'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'GraphQL',
  'REST APIs',
  'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'SQLite', 'Firebase', 'Oracle',
  'SQL', 'DynamoDB', 'Cassandra',
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'CI/CD', 'Jenkins',
  'Terraform', 'Linux', 'Nginx', 'Ansible',
  'Pandas', 'NumPy', 'scikit-learn', 'TensorFlow', 'PyTorch',
  'Machine Learning', 'Deep Learning', 'Data Analysis', 'Matplotlib',
  'Power BI', 'Tableau', 'Excel', 'NLP', 'Spark', 'Hadoop',
  'Git', 'GitHub', 'GitLab', 'Data Structures', 'Algorithms', 'OOP',
  'Agile', 'Jira', 'Figma', 'Postman', 'Microservices', 'System Design',
  'WebSockets',
];

// Pre-compiled regex patterns for word-boundary matching
const SKILL_PATTERNS = TRACKED_SKILLS.map((s) => ({
  canonical: s,
  regex: new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
}));

/**
 * Analyzes raw job listings to calculate skill frequency percentages and salary ranges.
 * @param {Array<object>} listings - Raw Adzuna listing objects
 * @returns {{skillFrequency: Map, salaryRange: {min: number|null, max: number|null}, sampleSize: number}}
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

  let salaryRange = { min: null, max: null };
  if (salaries.length) {
    const mins = salaries.map((s) => s.min).filter(Boolean);
    const maxs = salaries.map((s) => s.max).filter(Boolean);
    salaryRange = {
      min: mins.length ? Math.round(Math.min(...mins) / 100000) : null,
      max: maxs.length ? Math.round(Math.max(...maxs) / 100000) : null,
    };
    if (salaryRange.min !== null) salaryRange.min = Math.max(1, salaryRange.min);
    if (salaryRange.max !== null) salaryRange.max = Math.min(200, salaryRange.max);
  }

  return { skillFrequency, salaryRange, sampleSize: listings.length };
}

/** Computes the Monday Date object for the current ISO week. */
function currentWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/** Tracked job roles matching client `DREAM_ROLES`. */
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
 * Fetches listings for a single role and upserts weekly JobMarketSnapshot documents.
 * @param {string} role - Role name
 * @returns {Promise<number>} Count of upserted snapshot rows
 */
export async function fetchAndStoreForRole(role) {
  const weekOf = currentWeekStart();

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
      if (err.code !== 11000) throw err;
    }
  }

  return upserted;
}

/**
 * Executes a market data refresh across all 12 tracked roles.
 * @returns {Promise<number>} Total snapshots written
 */
export async function refreshAllRoles() {
  // eslint-disable-next-line no-console
  console.log('[JobMarket] Starting weekly market data refresh…');
  let total = 0;

  for (const role of TRACKED_ROLES) {
    const count = await fetchAndStoreForRole(role);
    total += count;
    await new Promise((r) => setTimeout(r, 500)); // Rate-limiting delay between requests
  }

  // eslint-disable-next-line no-console
  console.log(`[JobMarket] Refresh complete. ${total} snapshots upserted.`);
  return total;
}

/**
 * Seeds mock market snapshots when Adzuna credentials are absent or offline.
 * @param {string} role
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
      { skill: 'Git', percent: 50 },
    ],
    'Backend Developer': [
      { skill: 'Node.js', percent: 85 },
      { skill: 'Express', percent: 80 },
      { skill: 'REST APIs', percent: 80 },
      { skill: 'MongoDB', percent: 75 },
      { skill: 'Python', percent: 70 },
      { skill: 'SQL', percent: 70 },
      { skill: 'PostgreSQL', percent: 65 },
      { skill: 'Docker', percent: 55 },
    ],
    'Full Stack Developer': [
      { skill: 'React', percent: 90 },
      { skill: 'Node.js', percent: 80 },
      { skill: 'JavaScript', percent: 80 },
      { skill: 'SQL', percent: 70 },
      { skill: 'MongoDB', percent: 65 },
      { skill: 'TypeScript', percent: 65 },
      { skill: 'Git', percent: 60 },
      { skill: 'Docker', percent: 50 },
    ],
    'Data Scientist': [
      { skill: 'Python', percent: 95 },
      { skill: 'Data Analysis', percent: 85 },
      { skill: 'Pandas', percent: 80 },
      { skill: 'Machine Learning', percent: 80 },
      { skill: 'SQL', percent: 75 },
      { skill: 'NumPy', percent: 70 },
      { skill: 'TensorFlow', percent: 55 },
      { skill: 'R', percent: 50 },
    ],
    'Data Analyst': [
      { skill: 'SQL', percent: 90 },
      { skill: 'Excel', percent: 85 },
      { skill: 'Data Analysis', percent: 80 },
      { skill: 'Power BI', percent: 75 },
      { skill: 'Tableau', percent: 70 },
      { skill: 'Python', percent: 60 },
      { skill: 'Pandas', percent: 50 },
      { skill: 'Git', percent: 40 },
    ],
    'Machine Learning Engineer': [
      { skill: 'Python', percent: 95 },
      { skill: 'Machine Learning', percent: 90 },
      { skill: 'Deep Learning', percent: 80 },
      { skill: 'PyTorch', percent: 75 },
      { skill: 'TensorFlow', percent: 75 },
      { skill: 'scikit-learn', percent: 70 },
      { skill: 'Algorithms', percent: 65 },
      { skill: 'C++', percent: 50 },
    ],
    'DevOps Engineer': [
      { skill: 'Docker', percent: 90 },
      { skill: 'Kubernetes', percent: 85 },
      { skill: 'CI/CD', percent: 85 },
      { skill: 'AWS', percent: 80 },
      { skill: 'Linux', percent: 75 },
      { skill: 'Git', percent: 70 },
      { skill: 'Terraform', percent: 65 },
      { skill: 'Jenkins', percent: 60 },
    ],
    'Mobile App Developer': [
      { skill: 'Swift', percent: 80 },
      { skill: 'Kotlin', percent: 80 },
      { skill: 'React Native', percent: 75 },
      { skill: 'JavaScript', percent: 70 },
      { skill: 'TypeScript', percent: 60 },
      { skill: 'Git', percent: 50 },
      { skill: 'REST APIs', percent: 50 },
      { skill: 'OOP', percent: 40 },
    ],
    'Cloud Engineer': [
      { skill: 'AWS', percent: 90 },
      { skill: 'Azure', percent: 80 },
      { skill: 'GCP', percent: 70 },
      { skill: 'Linux', percent: 70 },
      { skill: 'Docker', percent: 65 },
      { skill: 'Kubernetes', percent: 60 },
      { skill: 'Terraform', percent: 50 },
      { skill: 'CI/CD', percent: 50 },
    ],
    'Cybersecurity Analyst': [
      { skill: 'Linux', percent: 85 },
      { skill: 'Networks', percent: 80 },
      { skill: 'Security', percent: 80 },
      { skill: 'Python', percent: 65 },
      { skill: 'SQL', percent: 55 },
      { skill: 'Docker', percent: 40 },
      { skill: 'Git', percent: 40 },
      { skill: 'Cloud', percent: 30 },
    ],
    'UI/UX Designer': [
      { skill: 'Figma', percent: 95 },
      { skill: 'CSS', percent: 60 },
      { skill: 'HTML', percent: 50 },
      { skill: 'JavaScript', percent: 40 },
      { skill: 'React', percent: 30 },
      { skill: 'Tailwind CSS', percent: 20 },
      { skill: 'Agile', percent: 40 },
      { skill: 'Git', percent: 20 },
    ],
    'Product Manager': [
      { skill: 'Agile', percent: 90 },
      { skill: 'Jira', percent: 85 },
      { skill: 'Data Analysis', percent: 75 },
      { skill: 'SQL', percent: 50 },
      { skill: 'Python', percent: 30 },
      { skill: 'Excel', percent: 70 },
      { skill: 'Figma', percent: 40 },
      { skill: 'Git', percent: 20 },
    ],
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
    'Product Manager': { min: 900000, max: 2500000 },
  };

  const skillsForRole = mockSkills[role] || [
    { skill: 'React', percent: 60 },
    { skill: 'Node.js', percent: 50 },
    { skill: 'Python', percent: 40 },
    { skill: 'Git', percent: 40 },
  ];

  const salRange = mockSalaries[role] || { min: 500000, max: 1200000 };
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
          weekOf,
        },
        { upsert: true, new: true }
      );
    } catch (e) {
      // Ignore duplicate key errors
    }
  }
}

/**
 * Returns latest market skill frequency data for a target role.
 * Fallbacks to seeding mock data if no database snapshot exists.
 *
 * @param {string} role - Role name
 * @returns {Promise<{skills: Array<object>, lastUpdated: Date|null, sampleSize: number, available: boolean}>}
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
 * Returns aggregated salary range projection (in LPA) for a role.
 *
 * @param {string} role - Target role name
 * @returns {Promise<{min: number|null, max: number|null, lastUpdated: Date|null, available: boolean}>}
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
