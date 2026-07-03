import { cn } from '@/lib/cn';

/** Rounded surface card used across the app. */
export function Card({ className, glass = false, children, ...props }) {
  return (
    <div
      className={cn(
        glass ? 'glass' : 'card',
        'rounded-2xl p-6 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
