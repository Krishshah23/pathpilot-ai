/**
 * components/dashboard/PeerBenchmarkCard.jsx — Anonymous Peer Score Comparison Card
 *
 * Shown on the Overview dashboard below the Path Score card. Collapsed by default —
 * shows just the headline percentile. Expands on click to reveal the score
 * distribution histogram, a motivational nudge, and a per-factor comparison
 * against peers targeting the same dream role.
 *
 * All data is pre-aggregated server-side (see peerBenchmark.service.js) — this
 * component never sees individual peer scores, only anonymous statistics.
 */

import { useState } from 'react';
import { Icon } from '@/components/ui/icons';
import { ScoreHistogram } from '@/components/charts/ScoreHistogram';
import { cn } from '@/lib/cn';

const STATUS_LABEL = {
  above: 'Above average',
  below: 'Below average',
  about_average: 'About average',
};

const STATUS_COLOR = {
  above: 'text-brand',
  below: 'text-danger',
  about_average: 'text-muted',
};

export function PeerBenchmarkCard({ benchmark, loading, bare = false }) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className={cn(!bare && 'card p-6', 'animate-pulse')}>
        <div className="h-4 w-40 rounded bg-surface-2 mb-3" />
        <div className="h-3 w-64 rounded bg-surface-2" />
      </div>
    );
  }

  if (!benchmark || !benchmark.available) {
    const reason = benchmark?.reason;
    const message =
      reason === 'not_enough_peers'
        ? `Not enough ${benchmark.dreamRole} peers on PathPilot yet to compare — check back soon.`
        : reason === 'no_score_yet'
        ? 'Complete your profile and analyze a resume to see how you compare to peers.'
        : 'Set a target role to unlock peer benchmarking.';

    return (
      <div className={cn(!bare && 'card p-6', 'flex items-center gap-3')}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-faint border border-line">
          <Icon.Users size={16} />
        </span>
        <p className="text-xs text-muted leading-relaxed">{message}</p>
      </div>
    );
  }

  // "Top X%" reads great near the top but turns into a nonsense/deflating statement
  // near the bottom ("top 100%" is trivially true and says nothing useful). Below a
  // beat-rate of 25%, switch to a growth-oriented framing instead of a percentile claim.
  const headline =
    benchmark.betterThanPercent >= 25 ? (
      <>
        You're in the <strong className="text-brand">top {benchmark.topPercent}%</strong> of{' '}
        {benchmark.dreamRole} candidates on PathPilot.
      </>
    ) : (
      <>
        <strong className="text-brand">{benchmark.peerCount}</strong> {benchmark.dreamRole} peers are
        ahead of you on PathPilot right now — plenty of room to climb.
      </>
    );

  return (
    <div className={cn(!bare && 'card p-6')}>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-4 text-left"
      >
        <div className="flex items-start gap-3">
          {!bare && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-brand border border-line">
              <Icon.Users size={16} />
            </span>
          )}
          <div>
            {!bare && <h3 className="text-sm font-bold text-ink">Peer Benchmarking</h3>}
            <p className={cn('text-sm text-muted', !bare && 'mt-1')}>{headline}</p>
          </div>
        </div>
        <Icon.ChevronDown
          size={16}
          className={cn('shrink-0 text-faint transition-transform duration-200', expanded && 'rotate-180')}
        />
      </button>

      {expanded && (
        <div className="mt-6 pt-6 border-t border-line space-y-6">
          <div>
            <p className="text-[10px] font-bold text-faint uppercase tracking-wider mb-3">
              Score Distribution · {benchmark.peerCount} peers
            </p>
            <ScoreHistogram data={benchmark.histogram} yourBucket={benchmark.yourBucket} />
          </div>

          <div className="rounded-xl border border-line bg-surface-2 px-4 py-3">
            <p className="text-xs text-ink font-medium">
              {benchmark.alreadyTopTier
                ? "You're already in the top 10% for this role — keep it up!"
                : `You're ${benchmark.pointsToNextTier} point${benchmark.pointsToNextTier === 1 ? '' : 's'} away from the top 10%.`}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold text-faint uppercase tracking-wider mb-3">How you compare</p>
            <div className="space-y-2.5">
              {benchmark.factorComparison.map((f) => (
                <div key={f.key} className="flex items-center justify-between text-xs">
                  <span className="text-ink font-medium">{f.label}</span>
                  <span className={cn('font-semibold', STATUS_COLOR[f.status])}>
                    {STATUS_LABEL[f.status]}
                    {f.peerAvg !== null && (
                      <span className="text-faint font-normal"> · you {f.yourScore} / avg {f.peerAvg}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
