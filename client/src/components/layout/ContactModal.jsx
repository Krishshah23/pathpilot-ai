/**
 * components/layout/ContactModal.jsx — "Contact & Feedback" Dropdown Modal
 *
 * Opened from the account dropdown in AppShell's TopNav. Dark glassmorphism
 * panel with developer contact links + a lightweight feedback form that hands
 * off to the user's mail client (mailto:) — no backend endpoint, per the
 * frontend-only scope of this task.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

const LINKS = [
  { label: 'Email', icon: 'Mail', href: 'mailto:krish23076@gmail.com' },
  { label: 'LinkedIn', icon: 'Linkedin', href: 'https://www.linkedin.com/in/kreesh' },
  { label: 'GitHub', icon: 'Github', href: 'https://github.com/Krishshah23' },
  { label: 'Instagram', icon: 'Instagram', href: 'https://kreesh.me' },
  { label: 'Portfolio', icon: 'Globe', href: 'https://www.kreesh.me' },
];

export function ContactModal({ onClose }) {
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const sendFeedback = () => {
    const subject = encodeURIComponent('PathPilot Feedback');
    const body = encodeURIComponent(feedback.trim() || '(no message written)');
    window.location.href = `mailto:krish23076@gmail.com?subject=${subject}&body=${body}`;
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-scale" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl border border-brand/25 bg-surface/95 backdrop-blur-2xl shadow-2xl animate-fade-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between px-6 pt-6">
          <div>
            <h3 className="font-serif text-lg font-bold text-ink">Get in Touch</h3>
            <p className="text-xs text-muted mt-1">Built by Krish Shah · Open to feedback, collaboration, and opportunities</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-faint hover:bg-surface-2 hover:text-ink transition-colors">
            <Icon.X size={18} />
          </button>
        </div>

        {/* Developer card */}
        <div className="mx-6 mt-5 rounded-xl border border-line bg-surface-2 p-4 flex items-center gap-3.5">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white font-bold text-sm shadow-sm"
            style={{ background: 'linear-gradient(135deg, var(--brand-grad-from, #2D6A4F), var(--brand-grad-to, #40916C))' }}
          >
            KS
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink">Krish Shah</p>
            <p className="text-xs text-muted">Full Stack Developer &amp; AI Engineer</p>
            <p className="text-[11px] text-faint flex items-center gap-1 mt-0.5">
              <Icon.MapPin size={11} /> Ahmedabad, India
            </p>
          </div>
        </div>

        {/* Social pills */}
        <div className="px-6 mt-4 flex flex-wrap gap-2">
          {LINKS.map((l) => {
            const LinkIcon = Icon[l.icon];
            return (
              <a
                key={l.label}
                href={l.href}
                target={l.href.startsWith('mailto:') ? undefined : '_blank'}
                rel={l.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink hover:border-brand/40 hover:text-brand transition-colors"
              >
                <LinkIcon size={13} /> {l.label}
              </a>
            );
          })}
        </div>

        {/* Feedback form */}
        <div className="px-6 mt-5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-faint mb-2">Feedback</label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share your thoughts about PathPilot…"
            className="input w-full min-h-[90px] resize-none text-sm"
          />
          <button
            onClick={sendFeedback}
            className={cn('btn-gradient mt-3 w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2')}
          >
            <Icon.Send size={14} /> Send Feedback
          </button>
        </div>

        <p className="px-6 py-5 text-[11px] text-faint text-center leading-relaxed">
          PathPilot is a college project. Your feedback genuinely helps improve it 🙏
        </p>
      </div>
    </div>,
    document.body
  );
}
