import { Logo } from '@/components/ui/Logo';

const HIGHLIGHTS = [
  { title: 'Path Score', desc: 'An explainable readiness score, not a random number.' },
  { title: 'Gap Navigator', desc: 'See exactly which skills stand between you and your dream role.' },
  { title: 'Growth Path', desc: 'A personalized, week-by-week roadmap to get job-ready.' },
];

/**
 * Split-screen auth shell: brand story on the left, the form on the right.
 * Collapses to a single column on small screens.
 */
export function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden border-r border-line lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Logo />
        <div className="max-w-md">
          <h1 className="font-display text-4xl font-extrabold leading-tight text-ink">
            Navigate your career.{' '}
            <span className="text-gradient">Powered by intelligence.</span>
          </h1>
          <p className="mt-4 text-muted">
            PathPilot is your personal career operating system — understand where you stand and
            build a clear path to job-ready.
          </p>

          <ul className="mt-10 space-y-4">
            {HIGHLIGHTS.map((h) => (
              <li key={h.title} className="flex gap-3">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg btn-brand text-xs text-white">
                  ✓
                </span>
                <div>
                  <p className="font-semibold text-ink">{h.title}</p>
                  <p className="text-sm text-muted">{h.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-faint">© {new Date().getFullYear()} PathPilot AI</p>
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
