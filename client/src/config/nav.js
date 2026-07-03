import { Icon } from '@/components/ui/icons';

/*
  Sidebar navigation. `ready: false` items render as disabled with a "Soon" tag
  and are enabled as each module ships. `admin: true` items show only for admins.
*/
export const NAV_ITEMS = [
  { label: 'Command Center', path: '/dashboard', icon: Icon.Compass, ready: true },
  { label: 'Resume Intelligence', path: '/resume', icon: Icon.FileText, ready: true },
  { label: 'Path Score', path: '/path-score', icon: Icon.Gauge, ready: false },
  { label: 'Gap Navigator', path: '/gap', icon: Icon.Target, ready: false },
  { label: 'Growth Path', path: '/growth', icon: Icon.Route, ready: false },
  { label: 'Insights', path: '/insights', icon: Icon.ChartBar, ready: false },
  { label: 'Opportunity Tracker', path: '/opportunities', icon: Icon.Briefcase, ready: false },
  { label: 'Career Report', path: '/report', icon: Icon.Document, ready: false },
  { label: 'Profile', path: '/profile', icon: Icon.User, ready: true },
  { label: 'Admin', path: '/admin', icon: Icon.Shield, ready: false, admin: true },
];
