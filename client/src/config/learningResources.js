/**
 * config/learningResources.js — Curated Learning Resource Map
 *
 * Static, hand-picked resource recommendations per skill for the Skill Roadmap
 * (ExecutionEnginePage). Kept as a plain lookup table (not a Gemini call) so
 * roadmap rendering stays instant and free of extra AI quota usage — the
 * skills that show up in gap analysis are a fairly small, recurring set of
 * mainstream technologies.
 *
 * Any skill not in RESOURCE_MAP falls back to generated search links so the
 * "Learning Resources" section is never empty.
 */

const RESOURCE_MAP = {
  'react': [
    { title: 'React Official Docs — Learn', url: 'https://react.dev/learn', type: 'article', free: true, level: 'Beginner', time: '~6 hrs' },
    { title: 'React Course — freeCodeCamp', url: 'https://www.youtube.com/results?search_query=react+course+freecodecamp', type: 'video', free: true, level: 'Beginner', time: '~10 hrs' },
    { title: 'Epic React — Kent C. Dodds', url: 'https://epicreact.dev/', type: 'course', free: false, level: 'Advanced', time: '~20 hrs' },
  ],
  'node.js': [
    { title: 'Node.js Official Docs', url: 'https://nodejs.org/en/learn', type: 'article', free: true, level: 'Beginner', time: '~5 hrs' },
    { title: 'Node.js Full Course — freeCodeCamp', url: 'https://www.youtube.com/results?search_query=node.js+full+course+freecodecamp', type: 'video', free: true, level: 'Beginner', time: '~8 hrs' },
  ],
  'javascript': [
    { title: 'JavaScript.info', url: 'https://javascript.info/', type: 'article', free: true, level: 'Beginner', time: '~15 hrs' },
    { title: 'JavaScript Algorithms & Data Structures — freeCodeCamp', url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/', type: 'course', free: true, level: 'Beginner', time: '~30 hrs' },
  ],
  'typescript': [
    { title: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/handbook/intro.html', type: 'article', free: true, level: 'Intermediate', time: '~6 hrs' },
    { title: 'TypeScript Course — Programming with Mosh', url: 'https://www.youtube.com/results?search_query=typescript+course+programming+with+mosh', type: 'video', free: true, level: 'Beginner', time: '~5 hrs' },
  ],
  'python': [
    { title: 'Python Official Tutorial', url: 'https://docs.python.org/3/tutorial/', type: 'article', free: true, level: 'Beginner', time: '~8 hrs' },
    { title: 'CS50P — Harvard (edX)', url: 'https://cs50.harvard.edu/python/', type: 'course', free: true, level: 'Beginner', time: '~20 hrs' },
  ],
  'sql': [
    { title: 'SQL Tutorial — Mode Analytics', url: 'https://mode.com/sql-tutorial/', type: 'article', free: true, level: 'Beginner', time: '~4 hrs' },
    { title: 'SQL for Data Analysis — freeCodeCamp', url: 'https://www.youtube.com/results?search_query=sql+course+freecodecamp', type: 'video', free: true, level: 'Beginner', time: '~4 hrs' },
  ],
  'mongodb': [
    { title: 'MongoDB Official Docs', url: 'https://www.mongodb.com/docs/manual/', type: 'article', free: true, level: 'Intermediate', time: '~5 hrs' },
    { title: 'MongoDB University', url: 'https://learn.mongodb.com/', type: 'course', free: true, level: 'Beginner', time: '~10 hrs' },
  ],
  'docker': [
    { title: 'Docker Get Started Guide', url: 'https://docs.docker.com/get-started/', type: 'article', free: true, level: 'Beginner', time: '~3 hrs' },
    { title: 'TechWorld with Nana — Docker Tutorial', url: 'https://www.youtube.com/results?search_query=techworld+with+nana+docker', type: 'video', free: true, level: 'Beginner', time: '~4 hrs' },
  ],
  'kubernetes': [
    { title: 'Kubernetes Official Docs — Tutorials', url: 'https://kubernetes.io/docs/tutorials/', type: 'article', free: true, level: 'Advanced', time: '~10 hrs' },
    { title: 'TechWorld with Nana — Kubernetes Course', url: 'https://www.youtube.com/results?search_query=techworld+with+nana+kubernetes', type: 'video', free: true, level: 'Intermediate', time: '~6 hrs' },
  ],
  'aws': [
    { title: 'AWS Skill Builder — Free Digital Training', url: 'https://skillbuilder.aws/', type: 'course', free: true, level: 'Beginner', time: '~10 hrs' },
    { title: 'AWS Certified Cloud Practitioner — freeCodeCamp', url: 'https://www.youtube.com/results?search_query=aws+cloud+practitioner+freecodecamp', type: 'video', free: true, level: 'Beginner', time: '~14 hrs' },
  ],
  'git': [
    { title: 'Pro Git (free book)', url: 'https://git-scm.com/book/en/v2', type: 'article', free: true, level: 'Beginner', time: '~3 hrs' },
    { title: 'Git & GitHub Crash Course', url: 'https://www.youtube.com/results?search_query=git+and+github+crash+course', type: 'video', free: true, level: 'Beginner', time: '~2 hrs' },
  ],
  'rest apis': [
    { title: 'REST API Tutorial', url: 'https://restfulapi.net/', type: 'article', free: true, level: 'Beginner', time: '~3 hrs' },
  ],
  'graphql': [
    { title: 'GraphQL Official Docs', url: 'https://graphql.org/learn/', type: 'article', free: true, level: 'Intermediate', time: '~4 hrs' },
  ],
  'css': [
    { title: 'CSS — MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Web/CSS', type: 'article', free: true, level: 'Beginner', time: '~6 hrs' },
    { title: 'CSS Course — freeCodeCamp', url: 'https://www.youtube.com/results?search_query=css+course+freecodecamp', type: 'video', free: true, level: 'Beginner', time: '~8 hrs' },
  ],
  'html': [
    { title: 'HTML — MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML', type: 'article', free: true, level: 'Beginner', time: '~3 hrs' },
  ],
  'express': [
    { title: 'Express.js Official Guide', url: 'https://expressjs.com/en/guide/routing.html', type: 'article', free: true, level: 'Beginner', time: '~3 hrs' },
  ],
  'django': [
    { title: 'Django Official Tutorial', url: 'https://docs.djangoproject.com/en/stable/intro/tutorial01/', type: 'article', free: true, level: 'Intermediate', time: '~8 hrs' },
  ],
  'flask': [
    { title: 'Flask Official Quickstart', url: 'https://flask.palletsprojects.com/en/latest/quickstart/', type: 'article', free: true, level: 'Beginner', time: '~3 hrs' },
  ],
  'system design': [
    { title: 'System Design Primer (GitHub)', url: 'https://github.com/donnemartin/system-design-primer', type: 'article', free: true, level: 'Advanced', time: '~20 hrs' },
    { title: 'Gaurav Sen — System Design', url: 'https://www.youtube.com/results?search_query=gaurav+sen+system+design', type: 'video', free: true, level: 'Advanced', time: '~10 hrs' },
  ],
  'data structures': [
    { title: 'DSA — freeCodeCamp', url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/', type: 'course', free: true, level: 'Intermediate', time: '~25 hrs' },
  ],
  'machine learning': [
    { title: 'Machine Learning — Andrew Ng (Coursera)', url: 'https://www.coursera.org/specializations/machine-learning-introduction', type: 'course', free: false, level: 'Intermediate', time: '~60 hrs' },
  ],
  'next.js': [
    { title: 'Next.js Official Docs — Learn', url: 'https://nextjs.org/learn', type: 'course', free: true, level: 'Intermediate', time: '~6 hrs' },
  ],
  'redis': [
    { title: 'Redis Official Docs', url: 'https://redis.io/docs/latest/', type: 'article', free: true, level: 'Intermediate', time: '~3 hrs' },
  ],
  'postgresql': [
    { title: 'PostgreSQL Tutorial', url: 'https://www.postgresqltutorial.com/', type: 'article', free: true, level: 'Beginner', time: '~5 hrs' },
  ],
  'ci/cd': [
    { title: 'CI/CD Concepts — GitLab Docs', url: 'https://docs.gitlab.com/ee/ci/', type: 'article', free: true, level: 'Intermediate', time: '~4 hrs' },
  ],
  'testing': [
    { title: 'Testing JavaScript — Jest Docs', url: 'https://jestjs.io/docs/getting-started', type: 'article', free: true, level: 'Intermediate', time: '~4 hrs' },
  ],
};

const ALIASES = {
  'nodejs': 'node.js',
  'node': 'node.js',
  'js': 'javascript',
  'ts': 'typescript',
  'postgres': 'postgresql',
  'k8s': 'kubernetes',
  'rest api': 'rest apis',
  'ci cd': 'ci/cd',
};

/** Builds fallback search-link resources for a skill with no curated entry. */
function genericResources(skill) {
  const q = encodeURIComponent(skill);
  return [
    { title: `${skill} — freeCodeCamp search`, url: `https://www.freecodecamp.org/news/search/?query=${q}`, type: 'article', free: true, level: 'Beginner', time: 'Varies' },
    { title: `${skill} crash course — YouTube search`, url: `https://www.youtube.com/results?search_query=${q}+crash+course`, type: 'video', free: true, level: 'Beginner', time: 'Varies' },
  ];
}

/** Returns 2-3 curated (or generic fallback) learning resources for a skill name. */
export function getLearningResources(skillOrTitle) {
  if (!skillOrTitle) return [];
  const key = skillOrTitle.trim().toLowerCase();
  const normalized = ALIASES[key] || key;

  if (RESOURCE_MAP[normalized]) return RESOURCE_MAP[normalized];

  // Try to find a known skill name mentioned inside a longer task title
  // (e.g. task title "Master React Hooks & Context API" → matches "react").
  const found = Object.keys(RESOURCE_MAP).find((k) => key.includes(k));
  if (found) return RESOURCE_MAP[found];

  return genericResources(skillOrTitle.trim());
}
