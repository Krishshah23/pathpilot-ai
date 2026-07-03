import { cn } from '@/lib/cn';

const STATUS_COLOR = {
  good: 'bg-success',
  warn: 'bg-warning',
  bad: 'bg-danger',
};

/** Per-factor resume-health bars with the tip shown when points were missed. */
export function HealthBreakdown({ breakdown = [] }) {
  return (
    <div className="space-y-4">
      {breakdown.map((f) => {
        const pct = f.max ? Math.round((f.score / f.max) * 100) : 0;
        return (
          <div key={f.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink">{f.label}</span>
              <span className="text-faint">
                {f.score}/{f.max}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className={cn('h-full rounded-full transition-all', STATUS_COLOR[f.status])}
                style={{ width: `${pct}%` }}
              />
            </div>
            {f.tip && <p className="mt-1 text-xs text-faint">{f.tip}</p>}
          </div>
        );
      })}
    </div>
  );
}
