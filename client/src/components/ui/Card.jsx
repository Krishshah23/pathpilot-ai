import { cn } from '@/lib/cn';

/** Flat white card — warm border, zero shadow. */
export function Card({ className, glass = false, children, ...props }) {
  return (
    <div
      className={cn(
        'card rounded-2xl p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
