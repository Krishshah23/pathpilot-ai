/**
 * components/layout/AuthLayout.jsx — Login / Sign up shell
 *
 * Shared by LoginPage and RegisterPage: nav + the auth card itself (tab
 * switcher + whatever form the page passes in as children), centered on a
 * quiet dot-grid background. No hero copy or decorative graphic — kept
 * deliberately minimal.
 */

import { Link } from 'react-router-dom';
import { LogoMark } from '@/components/ui/Logo';
import { cn } from '@/lib/cn';

const TABS = [
  { key: 'login', label: 'Log in', to: '/login' },
  { key: 'register', label: 'Sign up', to: '/register' },
];

export function AuthLayout({ title, subtitle, children, activeTab }) {
  return (
    <div className="auth-dot-grid min-h-screen bg-canvas flex flex-col">
      {/* Nav */}
      <nav className="flex items-center px-6 sm:px-12 py-6 border-b border-line">
        <Link to="/" className="flex items-center gap-2.5">
          <LogoMark size={32} />
          <span className="font-display text-lg text-ink">
            PathPilot<span className="text-[#2FD3C6]">AI</span>
          </span>
        </Link>
      </nav>

      {/* Centered auth card */}
      <div className="relative flex-1 flex items-center justify-center px-6 py-14">
        <div className="card relative z-10 w-[380px] max-w-[88vw] p-8 sm:p-9">
          {activeTab && (
            <div className="apple-segmented mb-6 flex w-full">
              {TABS.map((tab) => (
                <Link
                  key={tab.key}
                  to={tab.to}
                  className={cn(
                    'apple-segmented-item flex-1 text-center py-2 text-[13px] font-semibold transition-colors',
                    activeTab === tab.key ? 'bg-brand text-white' : 'text-muted hover:text-ink'
                  )}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          )}

          <h2 className="font-display text-2xl font-medium text-ink">{title}</h2>
          {subtitle && <p className="mt-1 text-[12.5px] text-muted">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </div>
      </div>
    </div>
  );
}
