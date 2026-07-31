/**
 * components/auth/FeatureVisuals.jsx — Small, real (not icon-in-circle) visual
 * flourishes for each card in the auth landing's feature grid. Each one is a
 * tiny, purpose-built mockup of what that feature actually shows the user,
 * not a generic glyph — so the grid reads as varied, grounded product
 * previews instead of five identical icon+title+paragraph cards.
 */

import { cn } from '@/lib/cn';

/** Resume Builder + ATS — a live ATS-match ring, same construction as the real ScoreGauge. */
export function AtsRingVisual() {
  const pct = 94;
  const size = 60;
  const sw = 5;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.1)" strokeWidth={sw} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="#34D399" strokeWidth={sw} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
        />
      </svg>
      <span className="absolute text-[13px] font-bold text-white">{pct}%</span>
    </div>
  );
}

/** Resume Strategy / Gap Analysis — matched vs. missing keyword chips. */
export function KeywordGapVisual() {
  const matched = ['React', 'TypeScript'];
  const missing = ['Docker', 'AWS'];
  return (
    <div className="flex flex-wrap gap-1.5">
      {matched.map((k) => (
        <span key={k} className="rounded-full border border-[#34D399]/30 bg-[#34D399]/10 px-2 py-0.5 text-[10px] font-medium text-[#34D399]">
          {k}
        </span>
      ))}
      {missing.map((k) => (
        <span key={k} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-white/30 line-through">
          {k}
        </span>
      ))}
    </div>
  );
}

/** Skill Roadmap — week-by-week progress dots. */
export function RoadmapDotsVisual() {
  const weeks = [1, 1, 1, 0, 0, 0];
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        {weeks.map((done, i) => (
          <span key={i} className={cn('h-2 w-2 rounded-full', done ? 'bg-[#34D399]' : 'bg-white/15')} />
        ))}
      </div>
      <span className="font-mono text-[10px] text-white/40">Week 3 of 6</span>
    </div>
  );
}

/** Live Jobs — two miniature match rows (placeholder company names, no real endorsements implied). */
export function LiveJobsVisual() {
  const rows = [
    { role: 'Frontend Engineer', company: 'Quantum Systems', tier: 'strong' },
    { role: 'Full Stack Developer', company: 'Nimbus Labs', tier: 'partial' },
  ];
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.company} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{r.role}</p>
            <p className="text-[10px] text-white/40 truncate">{r.company}</p>
          </div>
          <span className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide',
            r.tier === 'strong' ? 'bg-[#34D399]/15 text-[#34D399]' : 'bg-[#818CF8]/15 text-[#A5B4FC]'
          )}>
            {r.tier === 'strong' ? 'Strong match' : 'Partial match'}
          </span>
        </div>
      ))}
    </div>
  );
}

/** AI Mock Interview Coach — a subtle animated voice waveform. */
export function InterviewWaveVisual() {
  const heights = [42, 72, 52, 92, 62, 38, 58];
  return (
    <div className="flex items-end gap-1 h-10">
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-1.5 rounded-full bg-[#34D399]/70 animate-interview-wave"
          style={{ height: `${h}%`, animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </div>
  );
}
