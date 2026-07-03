import { forwardRef, useState } from 'react';
import { cn } from '@/lib/cn';

/** Labeled text input with error state. */
export const Input = forwardRef(function Input(
  { label, error, hint, className, id, ...props },
  ref
) {
  const inputId = id || props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-muted">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'h-11 rounded-xl border bg-surface-2/60 px-4 text-sm text-ink placeholder:text-faint',
          'transition focus:outline-none focus:ring-2',
          error
            ? 'border-danger/60 focus:ring-danger/40'
            : 'border-line focus:border-brand/60 focus:ring-brand/30',
          className
        )}
        {...props}
      />
      {error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="text-xs text-faint">{hint}</span>
      ) : null}
    </div>
  );
});

/** Password input with show/hide toggle. */
export const PasswordInput = forwardRef(function PasswordInput(
  { label, error, hint, className, id, ...props },
  ref
) {
  const [show, setShow] = useState(false);
  const inputId = id || props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-muted">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={show ? 'text' : 'password'}
          className={cn(
            'h-11 w-full rounded-xl border bg-surface-2/60 px-4 pr-12 text-sm text-ink placeholder:text-faint',
            'transition focus:outline-none focus:ring-2',
            error
              ? 'border-danger/60 focus:ring-danger/40'
              : 'border-line focus:border-brand/60 focus:ring-brand/30',
            className
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-faint hover:text-muted"
          tabIndex={-1}
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="text-xs text-faint">{hint}</span>
      ) : null}
    </div>
  );
});
