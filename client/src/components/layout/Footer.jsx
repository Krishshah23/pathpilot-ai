/**
 * components/layout/Footer.jsx — App Footer
 *
 * Rendered inside AppShell's scrollable <main>, below all page content (not
 * fixed). Same nav destinations as TopNav plus a couple of static/placeholder
 * links, and the FAQ link routes to the standalone /faq page (see App.jsx).
 */

import { NavLink } from 'react-router-dom';
import { Icon } from '@/components/ui/icons';

const QUICK_LINKS = [
  { label: 'Overview', path: '/dashboard' },
  { label: 'Resume Builder', path: '/resume-builder' },
  { label: 'Resume Strategy', path: '/talent-analyzer' },
  { label: 'Skill Roadmap', path: '/execution-engine' },
  { label: 'Interview Prep', path: '/interview-prep' },
];

const PRODUCT_LINKS = [
  { label: 'Features', path: '/dashboard' },
  { label: 'How it works', path: '/faq' },
  { label: 'FAQs', path: '/faq' },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-line bg-surface rounded-2xl">
      <div className="px-6 sm:px-10 py-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div className="lg:col-span-1">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
              <span className="font-bold text-xs font-sans tracking-tight">PP</span>
            </span>
            <span className="font-serif font-bold text-ink text-base tracking-tight">PathPilot</span>
          </div>
          <p className="mt-3 text-xs text-muted leading-relaxed">Your AI career co-pilot.</p>
          <p className="mt-1 text-[11px] text-faint">© {year} PathPilot AI. Built for engineering students.</p>
        </div>

        {/* Quick links */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-faint mb-3">Quick Links</p>
          <ul className="space-y-2">
            {QUICK_LINKS.map((l) => (
              <li key={l.path}>
                <NavLink to={l.path} className="text-xs text-muted hover:text-ink transition-colors">
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Product */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-faint mb-3">Product</p>
          <ul className="space-y-2">
            {PRODUCT_LINKS.map((l) => (
              <li key={l.label}>
                <NavLink to={l.path} className="text-xs text-muted hover:text-ink transition-colors">
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Connect */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-faint mb-3">Connect</p>
          <ul className="space-y-2">
            <li>
              <a href="https://github.com/Krishshah23" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors">
                <Icon.Github size={13} /> GitHub
              </a>
            </li>
            <li>
              <a href="https://www.linkedin.com/in/kreesh" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors">
                <Icon.Linkedin size={13} /> LinkedIn
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line px-6 sm:px-10 py-4 flex items-center justify-center">
        <p className="text-[11px] text-faint text-center">
          Powered by advanced AI · Built with <span className="text-danger">❤</span> for engineering students
        </p>
      </div>
    </footer>
  );
}
