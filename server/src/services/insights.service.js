/**
 * services/insights.service.js — Career Insights & Skill Categorization Service
 *
 * ARCHITECTURAL PURPOSE:
 * Groups student skills into standard technical categories (Languages, Frontend, Backend,
 * Databases, DevOps & Cloud, Data & ML, Tools & CS) for rendering radar and bar charts
 * in OverviewPage and TalentAnalyzerPage.
 *
 * STABLE ORDER:
 * Uses a fixed category order (`CATEGORY_ORDER`) so chart axes remain stationary
 * and comparative across page navigations and re-renders. Uncategorized skills fall into "Other".
 */

// Canonical map mapping individual skill aliases to presentational categories
const SKILL_CATEGORY = {
  // Languages
  JavaScript: 'Languages', TypeScript: 'Languages', Python: 'Languages', Java: 'Languages',
  'C++': 'Languages', C: 'Languages', 'C#': 'Languages', Go: 'Languages', Rust: 'Languages',
  PHP: 'Languages', Ruby: 'Languages', Swift: 'Languages', Kotlin: 'Languages', R: 'Languages',
  // Frontend
  React: 'Frontend', 'Next.js': 'Frontend', Vue: 'Frontend', Angular: 'Frontend',
  Redux: 'Frontend', 'Tailwind CSS': 'Frontend', Bootstrap: 'Frontend', jQuery: 'Frontend',
  Sass: 'Frontend', HTML: 'Frontend', CSS: 'Frontend',
  // Backend
  'Node.js': 'Backend', Express: 'Backend', Django: 'Backend', Flask: 'Backend',
  FastAPI: 'Backend', 'Spring Boot': 'Backend', GraphQL: 'Backend', 'REST APIs': 'Backend',
  // Databases
  MongoDB: 'Databases', PostgreSQL: 'Databases', MySQL: 'Databases', Redis: 'Databases',
  SQLite: 'Databases', Firebase: 'Databases', Oracle: 'Databases', SQL: 'Databases',
  // DevOps / Cloud
  Docker: 'DevOps & Cloud', Kubernetes: 'DevOps & Cloud', AWS: 'DevOps & Cloud',
  Azure: 'DevOps & Cloud', GCP: 'DevOps & Cloud', 'CI/CD': 'DevOps & Cloud',
  Jenkins: 'DevOps & Cloud', Terraform: 'DevOps & Cloud', Linux: 'DevOps & Cloud',
  Nginx: 'DevOps & Cloud',
  // Data / ML
  Pandas: 'Data & ML', NumPy: 'Data & ML', 'scikit-learn': 'Data & ML',
  TensorFlow: 'Data & ML', PyTorch: 'Data & ML', 'Machine Learning': 'Data & ML',
  'Deep Learning': 'Data & ML', 'Data Analysis': 'Data & ML', Matplotlib: 'Data & ML',
  'Power BI': 'Data & ML', Tableau: 'Data & ML', Excel: 'Data & ML', NLP: 'Data & ML',
  // Tools / Concepts
  Git: 'Tools & CS', GitHub: 'Tools & CS', GitLab: 'Tools & CS', 'Data Structures': 'Tools & CS',
  Algorithms: 'Tools & CS', OOP: 'Tools & CS', Agile: 'Tools & CS', Jira: 'Tools & CS',
  Figma: 'Tools & CS', Postman: 'Tools & CS', Microservices: 'Tools & CS',
  'System Design': 'Tools & CS', WebSockets: 'Tools & CS',
};

// Fixed category ordering ensuring consistent axis rendering in Recharts components
const CATEGORY_ORDER = [
  'Languages',
  'Frontend',
  'Backend',
  'Databases',
  'DevOps & Cloud',
  'Data & ML',
  'Tools & CS',
];

/**
 * Computes skill counts per category for chart visualization.
 *
 * @param {Array<string>} [skills=[]] - Candidate's skill array
 * @returns {Array<{category: string, count: number}>} Ordered array of category count objects
 */
export function skillDistribution(skills = []) {
  const counts = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, 0]));
  let other = 0;

  skills.forEach((skill) => {
    const category = SKILL_CATEGORY[skill];
    if (category) counts[category] += 1;
    else other += 1;
  });

  const dist = CATEGORY_ORDER.map((category) => ({ category, count: counts[category] }));
  if (other) dist.push({ category: 'Other', count: other });
  return dist;
}
