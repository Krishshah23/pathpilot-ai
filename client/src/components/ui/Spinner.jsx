import { cn } from '@/lib/cn';

/** Minimal accessible loading spinner. */
export function Spinner({ className }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent',
        className
      )}
    />
  );
}

/** Full-screen centered loader for route/session transitions. */
export function FullScreenLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-muted">
      <Spinner className="h-8 w-8 text-brand" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
