/**
 * components/ui/Input.jsx — Text Input Components
 *
 * Two input components built on top of native HTML <input>:
 *
 * 1. Input         — standard labeled text input with optional error/hint message.
 * 2. PasswordInput — same as Input but with a "Show / Hide" toggle button
 *                    that switches the input between `type="password"` and `type="text"`.
 *
 * Both use `forwardRef` so parent components can attach a React ref directly to
 * the underlying <input> element (needed for form libraries, auto-focus, etc.).
 *
 * PROPS (shared by both):
 *   label     — the text label shown above the input
 *   error     — if truthy, shows a red error message below and makes border red
 *   hint      — if truthy (and no error), shows a grey hint message below
 *   className — extra classes for the <input> element itself
 *   id / name — used to link the <label> htmlFor to the <input> id
 *   ...props  — any other native input attributes (placeholder, required, onChange, etc.)
 *
 * USAGE:
 *   <Input
 *     label="Email"
 *     name="email"
 *     type="email"
 *     value={form.email}
 *     onChange={onChange}
 *     error={errors.email}    // e.g. "Enter a valid email"
 *   />
 *
 *   <PasswordInput
 *     label="Password"
 *     name="password"
 *     hint="Use 8+ characters"
 *   />
 */

import { forwardRef, useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * Input — labeled text input.
 * forwardRef lets the parent do: const ref = useRef(); <Input ref={ref} .../>
 * and then access the raw DOM input via ref.current.
 */
export const Input = forwardRef(function Input(
  { label, error, hint, className, id, ...props },
  ref
) {
  // Use the provided `id` or fall back to `name` to link label → input
  const inputId = id || props.name;

  return (
    <div className="flex flex-col gap-1.5">
      {/* Only render the label element if a `label` prop was passed */}
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-muted">
          {label}
        </label>
      )}

      <input
        ref={ref}          // forward the ref to the actual DOM element
        id={inputId}       // links to the label's htmlFor
        className={cn(
          // Base styling
          'h-11 rounded-xl border bg-surface-2/60 px-4 text-sm text-ink placeholder:text-faint',
          'transition focus:outline-none focus:ring-2',
          // Red border + ring when there's an error; brand colour when focused normally
          error
            ? 'border-danger/60 focus:ring-danger/40'
            : 'border-line focus:border-brand/60 focus:ring-brand/30',
          className
        )}
        {...props} // passes value, onChange, type, placeholder, required, etc.
      />

      {/* Show error message (red) OR hint message (grey), never both */}
      {error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="text-xs text-faint">{hint}</span>
      ) : null}
    </div>
  );
});

/**
 * PasswordInput — password input with show/hide toggle.
 * Identical to Input but manages a local `show` state that toggles
 * the input type between 'password' (masked) and 'text' (visible).
 */
export const PasswordInput = forwardRef(function PasswordInput(
  { label, error, hint, className, id, ...props },
  ref
) {
  // `show` controls whether the password characters are visible
  const [show, setShow] = useState(false);
  const inputId = id || props.name;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-muted">
          {label}
        </label>
      )}

      {/* Wrapper div enables absolute positioning of the Show/Hide button */}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={show ? 'text' : 'password'} // toggle between visible and masked
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

        {/* Show / Hide toggle — positioned inside the input on the right */}
        <button
          type="button"   // prevent accidental form submission
          onClick={() => setShow((s) => !s)} // toggle show state on click
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-faint hover:text-muted"
          tabIndex={-1}   // skip this button when tabbing through form fields
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
