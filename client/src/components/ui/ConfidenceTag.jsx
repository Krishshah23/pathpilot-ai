import { cn } from '@/lib/cn';

/**
 * Reusable confidence tag component (Phase 2).
 *
 * Shows a 3-tier confidence indicator (High / Moderate / Low) with a short
 * reason explaining the basis. Designed to be placed next to any ML
 * prediction score to signal how much the user should trust it.
 *
 * Props:
 *   confidence  — { tier: 'high'|'moderate'|'low', score: number, reason: string }
 *   marketBacked — if true, appends "backed by live market data" badge
 *   size         — 'sm' (inline) or 'md' (card-style)
 *   className    — extra classes
 */

const TIER_STYLES = {
  high: {
    dot: 'bg-success',
    text: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/30',
    label: 'High confidence',
    icon: '🟢',
  },
  moderate: {
    dot: 'bg-warning',
    text: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/30',
    label: 'Moderate confidence',
    icon: '🟡',
  },
  low: {
    dot: 'bg-danger',
    text: 'text-danger',
    bg: 'bg-danger/10',
    border: 'border-danger/30',
    label: 'Low confidence',
    icon: '🔴',
  },
};

export function ConfidenceTag({ confidence, marketBacked = false, size = 'sm', className }) {
  if (!confidence || !confidence.tier) return null;

  const tier = TIER_STYLES[confidence.tier] || TIER_STYLES.moderate;

  if (size === 'sm') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-tight',
          tier.bg, tier.border, tier.text,
          className
        )}
        title={confidence.reason}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', tier.dot)} />
        {tier.label}
        {marketBacked && (
          <span className="ml-0.5 text-[9px] opacity-80">+ market</span>
        )}
      </span>
    );
  }

  // size === 'md' — card-style with reason
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-xl border px-3 py-2',
        tier.bg, tier.border,
        className
      )}
    >
      <span className={cn('mt-0.5 h-2 w-2 shrink-0 rounded-full', tier.dot)} />
      <div className="min-w-0 flex-1">
        <p className={cn('text-xs font-semibold', tier.text)}>
          {tier.label}
          {marketBacked && (
            <span className="ml-1 text-[10px] font-medium opacity-80">— backed by live market data</span>
          )}
        </p>
        {confidence.reason && (
          <p className="mt-0.5 text-[11px] leading-tight text-muted">
            {confidence.reason}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Inline confidence indicator — just the dot + tier label, no border.
 * For use inside tight spaces like table cells or metric cards.
 */
export function ConfidenceDot({ confidence, className }) {
  if (!confidence || !confidence.tier) return null;
  const tier = TIER_STYLES[confidence.tier] || TIER_STYLES.moderate;

  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold', tier.text, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', tier.dot)} />
      {confidence.tier.charAt(0).toUpperCase() + confidence.tier.slice(1)}
    </span>
  );
}
