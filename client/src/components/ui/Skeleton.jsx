/**
 * components/ui/Skeleton.jsx — Loading Placeholder Primitives
 *
 * Pulsing placeholder shapes that mimic the layout of the content about to
 * load, so slow AI-backed requests (10s+ Gemini/Django calls) show a
 * recognizable outline instead of a blank area with a bare spinner.
 *
 * USAGE:
 *   <Skeleton className="h-4 w-40" />              // a single pulsing block
 *   <SkeletonChip />                                 // pill-shaped chip placeholder
 *   <SkeletonChips count={5} />                      // a row of chip placeholders
 */

import { cn } from '@/lib/cn';

/** Base pulsing rectangle — compose with Tailwind sizing classes. */
export function Skeleton({ className }) {
  return <div className={cn('rounded-lg bg-surface-2 animate-pulse', className)} />;
}

/** Pill-shaped placeholder mimicking a skill/keyword chip. */
export function SkeletonChip({ className, style }) {
  return <div className={cn('h-7 rounded-xl bg-surface-2 animate-pulse', className)} style={style} />;
}

/** A row of chip placeholders with varied widths so it doesn't look like a repeated pattern. */
export function SkeletonChips({ count = 6, widths = [70, 90, 60, 100, 80, 65] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonChip key={i} style={{ width: `${widths[i % widths.length]}px` }} />
      ))}
    </div>
  );
}
