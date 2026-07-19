/**
 * config/nav.js — Top Navigation Link Configuration
 *
 * Defines the 4 main hub links that appear in the top navigation bar (AppShell).
 * Centralising them here means changing a label or path only requires
 * editing this one file instead of hunting through multiple components.
 *
 * CURRENT HUB STRUCTURE:
 *   Overview        → /dashboard       (Path Score, Insights, AI Coach)
 *   Resume Strategy → /talent-analyzer (Resume upload + Gap analysis)
 *   Skill Roadmap   → /execution-engine (Learning roadmap + Job listings)
 *   Interview Prep  → /interview-prep  (Mock interviews with AI)
 */

export const NAV_LINKS = [
  { label: 'Overview',        path: '/dashboard' },
  { label: 'Resume Strategy', path: '/talent-analyzer' },
  { label: 'Skill Roadmap',   path: '/execution-engine' },
  { label: 'Interview Prep',  path: '/interview-prep' },
];

// Legacy alias — kept so any old component that imports NAV_ITEMS still works.
// Maps the same links but adds `icon: null` and `ready: true` fields that
// older components may have expected. New code should use NAV_LINKS.
export const NAV_ITEMS = NAV_LINKS.map((l) => ({ ...l, icon: null, ready: true }));
