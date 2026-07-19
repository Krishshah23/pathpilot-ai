/**
 * config/careerData.js — Static Reference Data for Dropdowns & Suggestions
 *
 * This file contains plain arrays used to populate form dropdowns and quick-pick
 * chips in the UI (Onboarding, Profile page, etc.).
 *
 * WHY keep this on the client?
 *   These lists are purely presentational — they help the user fill in forms
 *   quickly. The authoritative role→skill mappings used for ML gap analysis
 *   are owned by the Django AI service (ai-service/ml/data/skills.py), not here.
 *
 * CONTENTS:
 *   BRANCHES      — Engineering college branches for the profile dropdown
 *   SEMESTERS     — Semester 1-8 for the profile dropdown
 *   DREAM_ROLES   — Career target roles the user can pick during onboarding
 *   COMMON_SKILLS — Quick-add skill suggestions shown in the TagInput component
 */

// College branches shown in the Profile page dropdown
export const BRANCHES = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Data Science',
  'Artificial Intelligence',
  'Other',
];

// Generates [{value: 1, label: 'Semester 1'}, ..., {value: 8, label: 'Semester 8'}]
// Array.from({length: 8}) creates an array of 8 empty slots
// The callback (_, i) gives us the index i (0-7), we add 1 to get 1-8
export const SEMESTERS = Array.from({ length: 8 }, (_, i) => ({
  value: i + 1,
  label: `Semester ${i + 1}`,
}));

// The target roles a student can select during onboarding.
// Drives Path Score personalisation, Skill Roadmap, and Interview Prep.
export const DREAM_ROLES = [
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Scientist',
  'Data Analyst',
  'Machine Learning Engineer',
  'DevOps Engineer',
  'Mobile App Developer',
  'Flutter Developer',
  'Cloud Engineer',
  'Cybersecurity Analyst',
  'UI/UX Designer',
  'Product Manager',
];

// Common skills shown as quick-add chip suggestions below the TagInput.
// Clicking a chip instantly adds it to the user's skill list.
export const COMMON_SKILLS = [
  'JavaScript',
  'Python',
  'Java',
  'React',
  'Node.js',
  'SQL',
  'MongoDB',
  'HTML/CSS',
  'Git',
  'Docker',
  'AWS',
  'TypeScript',
  'C++',
  'Data Structures',
  'REST APIs',
  'Pandas',
];
