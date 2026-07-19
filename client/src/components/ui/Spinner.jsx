/**
 * components/ui/Spinner.jsx — Loading Spinner Components
 *
 * Two simple components for indicating loading states:
 *
 * 1. Spinner  — a small spinning ring, used INLINE next to text or inside buttons.
 *               Example: inside a Button when `loading={true}`.
 *
 * 2. FullScreenLoader — a full-page centered spinner with a label.
 *                       Used by Suspense (lazy page loading) and route guards
 *                       while the session is being restored on page load.
 *
 * HOW THE SPIN ANIMATION WORKS:
 *   `animate-spin` is a Tailwind class that applies a CSS `@keyframes` rotation.
 *   `border-t-transparent` makes one side of the border invisible, creating
 *   the classic "arc" spinner look (one quarter is see-through).
 *
 * USAGE:
 *   <Spinner />                              // small inline spinner
 *   <Spinner className="h-8 w-8 text-brand"/> // custom size + colour
 *   <FullScreenLoader />                     // full page spinner
 *   <FullScreenLoader label="Saving…" />     // with custom message
 */

import { cn } from '@/lib/cn';

/** Minimal accessible inline loading spinner. */
export function Spinner({ className }) {
  return (
    <span
      role="status"          // tells screen readers this element indicates a loading state
      aria-label="Loading"   // accessible label for screen reader users
      className={cn(
        // Core spinner: circular border with one transparent quarter + CSS spin animation
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent',
        className
      )}
    />
  );
}

/** Full-screen centered loader — shown during lazy page loading and session restore. */
export function FullScreenLoader({ label = 'Loading…' }) {
  return (
    // min-h-screen: takes up the full viewport height
    // flex + items-center + justify-center: centres content both vertically and horizontally
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-muted">
      <Spinner className="h-8 w-8 text-brand" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
