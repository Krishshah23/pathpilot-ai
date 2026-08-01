/**
 * components/ui/Logo.jsx — PathPilot AI Brand Logo
 *
 * Two exports:
 *   LogoMark — icon-only brand mark (rounded navy square, ascending growth
 *              bars, an arrow riding the staircase). Used anywhere space is
 *              tight (compact nav headers, footers, cards).
 *   Logo     — LogoMark + "PathPilot AI" wordmark, optionally with the
 *              "CAREER READINESS PLATFORM" tagline underneath.
 *
 * The icon's colors (navy #151A3D, teal #2FD3C6, orange #FF6B4A) are a fixed
 * brand identity, independent of the app's single emerald accent — same
 * reasoning as any product logo that doesn't reskin itself to match a
 * particular screen's theme.
 *
 * USAGE:
 *   <Logo />                       // full lockup
 *   <Logo tagline />                // + "CAREER READINESS PLATFORM"
 *   <Logo showText={false} />       // icon only (equivalent to <LogoMark />)
 *   <LogoMark size={28} />          // icon only, custom size
 */

import { cn } from '@/lib/cn';

/** Icon-only brand mark — rounded navy square with ascending growth bars + arrow. */
export function LogoMark({ size = 36, className }) {
  return (
    <svg
      viewBox="0 0 160 160"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      <rect width="160" height="160" rx="36" fill="#151A3D" />
      <rect x="28" y="100" width="16" height="28" rx="3" fill="#3A4080" />
      <rect x="54" y="84" width="16" height="44" rx="3" fill="#3A4080" />
      <rect x="80" y="64" width="16" height="64" rx="3" fill="#2FD3C6" />
      <rect x="106" y="40" width="16" height="88" rx="3" fill="#2FD3C6" />
      <path
        d="M28 108 L54 92 L80 72 L114 42"
        fill="none"
        stroke="#FF6B4A"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M100 38 L118 38 L118 56"
        fill="none"
        stroke="#FF6B4A"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Full PathPilot AI wordmark: LogoMark + text, optional tagline. */
export function Logo({ className, showText = true, tagline = false, size = 36 }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      {showText && (
        <div className="leading-none">
          <span className="font-display text-lg font-bold tracking-tight text-ink">
            PathPilot<span className="text-[#2FD3C6]">AI</span>
          </span>
          {tagline && (
            <p className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-faint">
              Career Readiness Platform
            </p>
          )}
        </div>
      )}
    </div>
  );
}
