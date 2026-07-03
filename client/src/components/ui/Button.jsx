import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

const VARIANTS = {
  brand: 'btn-brand text-white',
  outline: 'border border-line bg-surface-2/60 text-ink hover:bg-elevated',
  ghost: 'text-muted hover:text-ink hover:bg-surface-2',
  danger: 'bg-danger/90 text-white hover:bg-danger',
};

const SIZES = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
};

/** Primary button. Handles loading state + disabled styling consistently. */
export function Button({
  variant = 'brand',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
