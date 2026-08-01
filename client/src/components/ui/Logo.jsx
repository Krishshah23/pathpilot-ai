/**
 * components/ui/Logo.jsx — PathPilot AI Brand Logo
 *
 * Clean, modern typographic wordmark without cluttered icon boxes.
 */

import { cn } from '@/lib/cn';

/** Pure text brand mark — no icon box or dots */
export function LogoMark() {
  return null;
}

/** Clean, sleek PathPilot AI typographic wordmark. */
export function Logo({ className, tagline = false }) {
  return (
    <div className={cn('flex items-center gap-2 select-none', className)}>
      <div className="leading-none flex flex-col">
        <div className="flex items-center tracking-tight">
          <span className="font-display text-xl font-extrabold text-ink">
            Path<span className="text-emerald-500">Pilot</span>
          </span>
          <span className="ml-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            AI
          </span>
        </div>
        {tagline && (
          <p className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-faint">
            Career Readiness Platform
          </p>
        )}
      </div>
    </div>
  );
}
