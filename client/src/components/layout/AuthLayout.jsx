import { Logo } from '@/components/ui/Logo';
import { Icon } from '@/components/ui/icons';

const HIGHLIGHTS = [
  { title: 'Path Score', desc: 'An explainable readiness score, not a random number.', icon: <Icon.Target size={16} /> },
  { title: 'Gap Navigator', desc: 'See exactly which skills stand between you and your dream role.', icon: <Icon.Route size={16} /> },
  { title: 'Growth Path', desc: 'A personalized, week-by-week roadmap to get job-ready.', icon: <Icon.Sparkles size={16} /> },
];

/**
 * Split-screen auth shell: premium dark brand panel on the left, form on the right.
 * Collapses to a single column on small screens.
 */
export function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel — rich dark with subtle texture */}
      <div className="auth-brand-panel relative hidden overflow-hidden border-r border-[#1A2E24] lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Subtle glow orbs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#2B4C3F] opacity-[0.07] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#3D6B59] opacity-[0.05] rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <a href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 border border-white/10">
              <span className="text-white font-bold text-sm font-sans tracking-tight">PP</span>
            </span>
            <span className="font-serif font-bold text-white text-lg tracking-tight">
              PathPilot
            </span>
          </a>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="font-display text-4xl font-extrabold leading-tight text-white">
            Navigate your career.{' '}
            <span className="text-[#7FB5A0]">Powered by intelligence.</span>
          </h1>
          <p className="mt-4 text-[#8A9B93] leading-relaxed">
            PathPilot is your personal career operating system — understand where you stand and
            build a clear path to job-ready.
          </p>

          <ul className="mt-10 space-y-5">
            {HIGHLIGHTS.map((h, i) => (
              <li key={h.title} className="flex gap-3.5 animate-fade-up" style={{ animationDelay: `${0.1 + i * 0.1}s` }}>
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#2B4C3F]/40 border border-[#2B4C3F]/60 text-[#7FB5A0]">
                  {h.icon}
                </span>
                <div>
                  <p className="font-semibold text-white text-sm">{h.title}</p>
                  <p className="text-sm text-[#8A9B93] mt-0.5">{h.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-[#4A5E53]">© {new Date().getFullYear()} PathPilot AI</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
          {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
