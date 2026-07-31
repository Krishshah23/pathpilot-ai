/**
 * config/faqData.js — Shared FAQ Content (Task 5)
 *
 * Single source of truth reused by FAQSection wherever it's rendered
 * (the Login page's brand panel preview, and the standalone /faq page).
 */

export const FAQ_ITEMS = [
  {
    q: 'What is a Path Score?',
    a: 'A 0-100 career readiness score based on your resume quality, skills, projects, and profile completeness — an explainable snapshot of how job-ready you are right now.',
  },
  {
    q: 'How does the AI analyze my resume?',
    a: 'Our AI parses your resume and compares it against live market requirements for your target role, surfacing gaps, strengths, and ATS keyword matches.',
  },
  {
    q: 'Is my resume data private?',
    a: 'Yes — your data is stored securely and never shared. It is only used to power your own analysis, score, and recommendations.',
  },
  {
    q: 'What is the Skill Roadmap?',
    a: 'A personalized, week-by-week plan generated from your specific skill gaps, so you always know exactly what to work on next.',
  },
  {
    q: 'Can I use PathPilot without uploading a resume?',
    a: 'Yes — you can build one from scratch using the Resume Builder, with AI writing help and a live ATS score as you go.',
  },
  {
    q: 'How often should I update my resume?',
    a: 'Whenever you gain new skills or complete projects. PathPilot will re-analyze it and update your score automatically.',
  },
  {
    q: 'What is the AI Career Coach?',
    a: 'A context-aware AI assistant that knows your resume, gaps, and goals. Ask it anything career-related, any time.',
  },
];
