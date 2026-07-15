import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

const VARIANTS = {
  brand:   'bg-[#171717] text-white hover:bg-[#2a2a2a]',
  outline: 'border border-[#EAEAE5] bg-white text-[#171717] hover:bg-[#F5F5F3]',
  ghost:   'text-[#525252] hover:text-[#171717] hover:bg-[#F5F5F3]',
  danger:  'bg-[#B85A3C] text-white hover:bg-[#a04f34]',
  success: 'bg-[#2B4C3F] text-white hover:bg-[#3D6B59]',
};

const SIZES = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
};

/** Matte button — no gradients, solid colors only. */
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
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold',
        'transition-all duration-200 cubic-bezier(0.16, 1, 0.3, 1)',
        'hover:-translate-y-[1px] active:scale-[0.98]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B4C3F]/40',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none',
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
