/**
 * pages/FAQPage.jsx — Standalone FAQ Page (/faq)
 *
 * Always reachable (no auth required) — linked from the Footer's "FAQs" link
 * (rendered inside AppShell for logged-in users) and from the Login page's
 * "View all FAQs →" link (reachable by guests). Kept as a light standalone
 * shell rather than wrapped in AppShell since AppShell assumes a logged-in
 * user context.
 */

import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/icons';
import { LogoMark } from '@/components/ui/Logo';
import { FAQSection } from '@/components/FAQSection';

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-line">
        <div className="mx-auto max-w-3xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark size={32} />
            <span className="font-serif font-bold text-ink text-base tracking-tight">
              PathPilot<span className="text-[#2FD3C6]">AI</span>
            </span>
          </Link>
          <Link to="/login" className="text-xs font-semibold text-muted hover:text-ink transition-colors">
            ← Back to Login
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-14">
        <div className="text-center mb-10">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 border border-line text-brand mb-4">
            <Icon.Info size={22} />
          </span>
          <h1 className="font-serif text-3xl font-bold text-ink">Frequently Asked Questions</h1>
          <p className="text-sm text-muted mt-2">Everything you need to know about how PathPilot works.</p>
        </div>

        <FAQSection />
      </main>
    </div>
  );
}
