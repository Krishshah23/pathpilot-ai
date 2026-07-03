import { cn } from '@/lib/cn';

/** PathPilot AI wordmark + compass mark. */
export function Logo({ className, showText = true }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl btn-brand text-white">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path
            d="M12 2 15 12 12 22 9 12 12 2Z"
            fill="currentColor"
            opacity="0.9"
          />
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        </svg>
      </span>
      {showText && (
        <span className="font-display text-lg font-bold tracking-tight text-ink">
          PathPilot<span className="text-gradient"> AI</span>
        </span>
      )}
    </div>
  );
}
