import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

/** Labeled native select, styled to match the dark theme. */
export const Select = forwardRef(function Select(
  { label, error, hint, options = [], placeholder, className, id, children, ...props },
  ref
) {
  const selectId = id || props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-muted">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={cn(
          'h-11 rounded-xl border bg-surface-2/60 px-4 text-sm text-ink',
          'transition focus:outline-none focus:ring-2',
          error
            ? 'border-danger/60 focus:ring-danger/40'
            : 'border-line focus:border-brand/60 focus:ring-brand/30',
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => {
          const value = typeof opt === 'object' ? opt.value : opt;
          const text = typeof opt === 'object' ? opt.label : opt;
          return (
            <option key={value} value={value}>
              {text}
            </option>
          );
        })}
        {children}
      </select>
      {error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="text-xs text-faint">{hint}</span>
      ) : null}
    </div>
  );
});
