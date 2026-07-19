/**
 * components/ui/ConfidenceTag.jsx — ML Prediction Confidence Indicator
 *
 * Displays a coloured badge indicating how much the AI/ML model trusts a
 * particular prediction. This helps the user understand when a score is
 * based on rich data vs. when the model had very little to work with.
 *
 * THREE CONFIDENCE TIERS:
 *   🟢 High     — model is decisive, prediction is reliable
 *   🟡 Moderate — some uncertainty, take the number as a guide
 *   🔴 Low      — sparse data, treat with caution
 *
 * TWO SIZE VARIANTS:
 *   sm (default) — compact pill, used inline next to score numbers in cards
 *   md           — card-style with the reason text below the tier label
 *
 * EXPORTED COMPONENTS:
 *   ConfidenceTag — the main component (pill or card depending on `size`)
 *   ConfidenceDot — ultra-compact dot + tier word for use in tight spaces
 *
 * PROPS (ConfidenceTag):
 *   confidence   — object from backend: { tier: 'high'|'moderate'|'low', score, reason }
 *   marketBacked — if true, appends "backed by live market data" label
 *   size         — 'sm' | 'md'
 *   className    — extra classes
 *
 * USAGE:
 *   <ConfidenceTag confidence={predictions.resumeScoreConfidence} />
 *   <ConfidenceTag confidence={skill.confidence} marketBacked={skill.marketBacked} size="md" />
 *   <ConfidenceDot confidence={predictions.atsConfidence} />
 */

import { cn } from '@/lib/cn';

/**
 * Style map — each tier maps to colour tokens for:
 *   dot    — the small coloured circle
 *   text   — text colour
 *   bg     — semi-transparent background fill
 *   border — subtle border colour
 *   label  — human-readable tier name
 *   icon   — emoji representation
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
  // If no confidence data exists, render nothing (null = no DOM element)
  if (!confidence || !confidence.tier) return null;

  // Look up styles for the tier; fall back to 'moderate' if tier is unexpected
  const tier = TIER_STYLES[confidence.tier] || TIER_STYLES.moderate;

  // ── Small pill variant ──────────────────────────────────────────────
  if (size === 'sm') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-tight',
          tier.bg, tier.border, tier.text,
          className
        )}
        title={confidence.reason} // show full reason on hover (tooltip)
      >
        {/* Tiny coloured dot */}
        <span className={cn('h-1.5 w-1.5 rounded-full', tier.dot)} />
        {tier.label}
        {/* Optional "market" badge appended when backed by live job data */}
        {marketBacked && (
          <span className="ml-0.5 text-[9px] opacity-80">+ market</span>
        )}
      </span>
    );
  }

  // ── Medium card variant — includes the reason text ──────────────────
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-xl border px-3 py-2',
        tier.bg, tier.border,
        className
      )}
    >
      {/* Coloured dot on the left */}
      <span className={cn('mt-0.5 h-2 w-2 shrink-0 rounded-full', tier.dot)} />

      <div className="min-w-0 flex-1">
        {/* Tier label + optional market badge */}
        <p className={cn('text-xs font-semibold', tier.text)}>
          {tier.label}
          {marketBacked && (
            <span className="ml-1 text-[10px] font-medium opacity-80">— backed by live market data</span>
          )}
        </p>
        {/* Reason text (why the model is this confident) */}
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
 * ConfidenceDot — ultra-compact inline indicator.
 * Just a coloured dot + the tier word. No border, no background.
 * Use inside table cells or metric cards where space is very tight.
 *
 * USAGE: <ConfidenceDot confidence={predictions.atsConfidence} />
 */
export function ConfidenceDot({ confidence, className }) {
  if (!confidence || !confidence.tier) return null;
  const tier = TIER_STYLES[confidence.tier] || TIER_STYLES.moderate;

  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold', tier.text, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', tier.dot)} />
      {/* Capitalise first letter of the tier word (e.g. "high" → "High") */}
      {confidence.tier.charAt(0).toUpperCase() + confidence.tier.slice(1)}
    </span>
  );
}
