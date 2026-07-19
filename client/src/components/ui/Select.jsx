/**
 * components/ui/Select.jsx — Labeled Dropdown Select Component
 *
 * A styled wrapper around the native HTML <select> element.
 * Matches the same visual style as Input.jsx (border, rounding, focus ring).
 *
 * PROPS:
 *   label       — text label shown above the dropdown
 *   error       — if truthy, shows a red error message and red border
 *   hint        — grey helper text shown when there's no error
 *   options     — array of values to render as <option> elements.
 *                 Can be a simple string array ["React", "Vue"]
 *                 OR an object array [{ value: 1, label: 'Semester 1' }, ...]
 *   placeholder — a disabled first option that prompts the user to pick
 *                 (e.g. "Select a role") — its value is an empty string ""
 *   children    — optional: raw <option> or <optgroup> JSX for advanced cases
 *
 * USAGE:
 *   <Select
 *     label="Target Role"
 *     placeholder="Select a role"
 *     options={DREAM_ROLES}
 *     value={form.dreamRole}
 *     onChange={(e) => setDreamRole(e.target.value)}
 *     error={errors.dreamRole}
 *   />
 */

import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

/** Labeled native select, styled to match the app theme. */
export const Select = forwardRef(function Select(
  { label, error, hint, options = [], placeholder, className, id, children, ...props },
  ref
) {
  // Use the provided `id` or fall back to `name` to link label → select
  const selectId = id || props.name;

  return (
    <div className="flex flex-col gap-1.5">
      {/* Only render the label if one was provided */}
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
          // Red styling when there's a validation error
          error
            ? 'border-danger/60 focus:ring-danger/40'
            : 'border-line focus:border-brand/60 focus:ring-brand/30',
          className
        )}
        {...props} // passes value, onChange, required, etc.
      >
        {/* Placeholder option — disabled so the user must actively pick a real value */}
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}

        {/* Render options from the `options` array.
            Handles both simple strings and {value, label} objects. */}
        {options.map((opt) => {
          const value = typeof opt === 'object' ? opt.value : opt;
          const text  = typeof opt === 'object' ? opt.label : opt;
          return (
            <option key={value} value={value}>
              {text}
            </option>
          );
        })}

        {/* Allow fully custom <option> or <optgroup> JSX if passed as children */}
        {children}
      </select>

      {/* Show error (red) OR hint (grey), never both at the same time */}
      {error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="text-xs text-faint">{hint}</span>
      ) : null}
    </div>
  );
});
