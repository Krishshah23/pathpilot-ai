/**
 * components/landing/LandingVisuals.jsx — Small, real (not stock-photo)
 * visual mockups for the landing page's feature sections. Each one is a
 * tiny, purpose-built preview of what that feature actually shows in the
 * product, styled after the real screens rather than abstract graphics.
 *
 * Color discipline: brand green is reserved for genuinely primary/success
 * signals (a "strong match", a completed step) — everything else uses ink/
 * muted/surface neutrals so these don't read as "everything is green."
 */

import { cn } from '@/lib/cn';

/** Resume Strategy — factor-bar score breakdown, styled after the real page. */
export function ScoreBreakdownVisual() {
  const factors = [
    { label: 'Skill Coverage', pct: 100, tone: 'good' },
    { label: 'Project Depth', pct: 100, tone: 'good' },
    { label: 'Experience Signals', pct: 67, tone: 'warn' },
    { label: 'Resume Health (ATS)', pct: 100, tone: 'good' },
  ];
  return (
    <div className="card p-5 space-y-3">
      {factors.map((f) => (
        <div key={f.label}>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-ink font-medium">{f.label}</span>
            <span className={cn('font-mono', f.tone === 'warn' ? 'text-warning' : 'text-brand')}>{f.pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div
              className={cn('h-full rounded-full', f.tone === 'warn' ? 'bg-warning' : 'bg-brand')}
              style={{ width: `${f.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skill Roadmap — week-by-week progress. */
export function RoadmapVisual() {
  const weeks = [
    { label: 'Automated Testing Frameworks', done: true },
    { label: 'Advanced State Management', done: true },
    { label: 'Recommended depth: Docker', done: false },
  ];
  return (
    <div className="card p-5 space-y-2.5">
      {weeks.map((w) => (
        <div key={w.label} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5">
          <span className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-[10px] font-bold',
            w.done ? 'border-brand bg-brand text-white' : 'border-line text-faint'
          )}>
            {w.done ? '✓' : ''}
          </span>
          <span className={cn('text-xs font-medium', w.done ? 'text-faint line-through' : 'text-ink')}>{w.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Live Jobs — match rows (placeholder company names, no real endorsements implied). */
export function LiveJobsVisual() {
  const rows = [
    { role: 'Frontend Engineer', company: 'Quantum Systems', strong: true },
    { role: 'Full Stack Developer', company: 'Nimbus Labs', strong: false },
  ];
  return (
    <div className="card p-5 space-y-2.5">
      {rows.map((r) => (
        <div key={r.company} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink truncate">{r.role}</p>
            <p className="text-[11px] text-faint truncate">{r.company}</p>
          </div>
          <span className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide',
            r.strong ? 'bg-brand/10 text-brand' : 'bg-surface-2 text-muted'
          )}>
            {r.strong ? 'Strong match' : 'Explore'}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Interview Prep — a mock feedback card with a score chip + a quiet waveform. */
export function InterviewVisual() {
  const heights = [42, 72, 52, 92, 62, 38, 58];
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-ink">Communication clarity</span>
        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">92 / 100</span>
      </div>
      <div className="flex items-end gap-1 h-10">
        {heights.map((h, i) => (
          <span key={i} className="w-1.5 rounded-full bg-ink/20" style={{ height: `${h}%` }} />
        ))}
      </div>
      <p className="mt-4 text-[11px] text-faint leading-relaxed">
        "Strong structure, specific examples — tighten your close on the systems-design question."
      </p>
    </div>
  );
}
