/*
  Navigation config for PathPilot AI v2.
  The 4 main hub links are defined here and consumed by TopNav in AppShell.
*/
export const NAV_LINKS = [
  { label: 'Overview',        path: '/dashboard' },
  { label: 'Resume Strategy', path: '/talent-analyzer' },
  { label: 'Skill Roadmap',   path: '/execution-engine' },
  { label: 'Interview Prep',  path: '/interview-prep' },
];

// Legacy — kept for any component still importing NAV_ITEMS
export const NAV_ITEMS = NAV_LINKS.map((l) => ({ ...l, icon: null, ready: true }));
