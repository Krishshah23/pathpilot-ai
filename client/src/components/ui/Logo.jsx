/**
 * components/ui/Logo.jsx — PathPilot AI Brand Logo
 *
 * Renders the app's wordmark: a compass-needle SVG icon + "PathPilot AI" text.
 * The "AI" part uses a branded gradient class (`text-gradient` from index.css).
 *
 * PROPS:
 *   showText  — set to false to render only the icon square (for compact nav headers)
 *   className — extra classes for the wrapper (e.g. for margin or alignment)
 *
 * USAGE:
 *   <Logo />                    // full logo with text
 *   <Logo showText={false} />   // icon only (no text)
 *   <Logo className="mb-8" />   // add spacing
 *
 * WHERE IT'S USED:
 *   - Onboarding page (top of the wizard)
 *   - NotFoundPage (404 page center)
 *   - AuthLayout on mobile (replaces the left-panel brand text on small screens)
 */

import { cn } from '@/lib/cn';

/** PathPilot AI wordmark: compass mark + text with branded "AI" gradient. */
export function Logo({ className, showText = true }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>

      {/* Icon square — dark background with the compass needle SVG inside */}
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl btn-brand text-white">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          {/* Compass needle: a pointed diamond shape pointing up and down */}
          <path
            d="M12 2 15 12 12 22 9 12 12 2Z"
            fill="currentColor"
            opacity="0.9"
          />
          {/* Outer circle of the compass — slightly transparent */}
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        </svg>
      </span>

      {/* Text portion — only shown when showText={true} (the default) */}
      {showText && (
        <span className="font-display text-lg font-bold tracking-tight text-ink">
          PathPilot<span className="text-gradient">AI</span>
        </span>
      )}
    </div>
  );
}
