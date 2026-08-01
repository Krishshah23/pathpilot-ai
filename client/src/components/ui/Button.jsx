/**
 * components/ui/Button.jsx — Reusable Button Component
 *
 * The single source of truth for every button style in the app. Pick a
 * `variant` and `size` instead of writing raw class strings.
 *
 * VARIANTS (controls colour/style):
 *   primary   — filled accent (the one main action on a screen, e.g. "Save")
 *   secondary — outlined neutral (supporting actions, e.g. "Cancel")
 *   tertiary  — text-only, low emphasis (e.g. "Back")
 *
 * SIZES:
 *   sm — compact (inside tables, tight layouts)
 *   md — default
 *   lg — full-width forms (login, register)
 *
 * SPECIAL PROPS:
 *   loading — shows a spinner inside the button and disables it.
 *             Use this while an API call is in-flight to prevent double-clicks.
 *
 * USAGE:
 *   <Button>Default</Button>
 *   <Button variant="secondary" size="sm">Cancel</Button>
 *   <Button loading={submitting}>Save changes</Button>
 */

import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

// Map of variant names → Tailwind classes for background/text/hover colours
const VARIANTS = {
  primary:   'bg-ink text-white hover:bg-ink/85',
  secondary: 'border border-line bg-surface text-ink hover:bg-surface-2',
  tertiary:  'text-muted hover:text-ink hover:bg-surface-2',
  brand:     'bg-brand text-white hover:bg-brand-soft',  // use only for explicit green CTAs
};

// Map of size names → Tailwind height/padding/text classes
const SIZES = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
};

export function Button({
  variant = 'primary', // which colour scheme to use
  size = 'md',         // which size to use
  loading = false,     // shows spinner + disables button when true
  disabled,            // standard HTML disabled attribute
  className,           // extra classes passed from the parent
  children,            // the button label / content
  ...props             // any other HTML button attributes (onClick, type, etc.)
}) {
  return (
    <button
      // disabled when explicitly disabled OR when a loading operation is in progress
      disabled={disabled || loading}
      className={cn(
        // Base layout: inline flex so icon + text sit side by side
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold',
        // Smooth hover animation
        'transition-colors duration-200',
        // Keyboard accessibility: visible focus ring
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
        // Disabled state: cursor changes, opacity fades
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant], // apply the chosen colour scheme
        SIZES[size],       // apply the chosen size
        className          // allow parent to add extra classes
      )}
      {...props}
    >
      {/* Show a spinner on the left when loading is true */}
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
