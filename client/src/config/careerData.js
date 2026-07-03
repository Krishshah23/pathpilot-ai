/*
  Static reference data for onboarding/profile dropdowns and skill suggestions.
  Kept on the client because it's presentational; the ML service owns the
  authoritative role→skill mappings used for gap analysis in later phases.
*/

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

export const SEMESTERS = Array.from({ length: 8 }, (_, i) => ({
  value: i + 1,
  label: `Semester ${i + 1}`,
}));

export const DREAM_ROLES = [
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
