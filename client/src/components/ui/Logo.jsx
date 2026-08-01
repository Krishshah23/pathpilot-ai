/**
 * components/ui/Logo.jsx — PathPilot AI Brand Logo
 *
 * Designed specifically for PathPilot AI:
 * - Symbolism: An AI Pilot Compass Arrow intersecting an ascending Career Path curve & milestone nodes.
 * - Palette: Rich Emerald (#10B981) + Cyan/Teal (#06B6D4) gradients matching the app theme.
 */

import { cn } from '@/lib/cn';

/** Icon-only brand mark — squircle container with AI compass arrow + path curve. */
export function LogoMark({ size = 36, className }) {
  const gradientId = 'logo-emerald-grad';
  const glowId = 'logo-emerald-glow';

  return (
    <svg
      viewBox="0 0 160 160"
      width={size}
      height={size}
      className={cn('shrink-0 drop-shadow-sm', className)}
      aria-hidden="true"
    >
      <defs>
        {/* Emerald to Teal primary gradient */}
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="50%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>

        {/* Secondary Cyan Accent Gradient */}
        <linearGradient id="logo-teal-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>

        {/* Soft Glow */}
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background Container: Dark Ink Squircle */}
      <rect width="160" height="160" rx="40" fill="#0F172A" />
      <rect
        width="158"
        height="158"
        x="1"
        y="1"
        rx="39"
        fill="none"
        stroke="rgba(16, 185, 129, 0.2)"
        strokeWidth="2"
      />

      {/* Ambient Radial Glow */}
      <circle cx="95" cy="65" r="55" fill={`url(#${glowId})`} />

      {/* Ascending Career Path Ribbon (Curved Arc) */}
      <path
        d="M 32 120 C 45 115, 55 95, 75 90 C 95 85, 105 55, 128 42"
        fill="none"
        stroke="rgba(255, 255, 255, 0.15)"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Primary Gradient Path Line */}
      <path
        d="M 32 120 C 45 115, 55 95, 75 90 C 95 85, 105 55, 128 42"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Career Milestone Nodes (3 Progress Dots) */}
      <circle cx="36" cy="118" r="4.5" fill="#34D399" />
      <circle cx="75" cy="90" r="5" fill="#06B6D4" />
      
      {/* Pilot Compass Arrow (Forward Direction Vector) */}
      <path
        d="M 128 42 L 102 48 L 114 60 Z"
        fill={`url(#${gradientId})`}
      />
      <path
        d="M 128 42 L 114 60 L 104 76 L 118 70 L 128 42 Z"
        fill="url(#logo-teal-grad)"
        opacity="0.9"
      />

      {/* AI Navigation Spark Star at Tip */}
      <path
        d="M 134 32 L 136 38 L 142 40 L 136 42 L 134 48 L 132 42 L 126 40 L 132 38 Z"
        fill="#6EE7B7"
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
            PathPilot<span className="text-emerald-500 font-extrabold ml-0.5">AI</span>
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

