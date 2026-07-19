/**
 * components/ui/Button.jsx — Reusable Button Component
 *
 * A single button component that covers all the button styles used in the app.
 * Instead of writing raw <button> tags with long class strings on every page,
 * you use <Button> and just pick a `variant` and `size`.
 *
 * VARIANTS (controls colour/style):
 *   brand   — dark filled button (primary action, e.g. "Submit", "Save")
 *   outline — white with border (secondary action, e.g. "Cancel")
 *   ghost   — no background, text only (low-emphasis, e.g. "Back")
 *   danger  — red filled (destructive actions, e.g. "Delete")
 *   success — green filled (positive confirmation)
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
 *   <Button variant="outline" size="sm">Cancel</Button>
 *   <Button loading={submitting}>Save changes</Button>
 *   <Button variant="danger" onClick={handleDelete}>Delete</Button>
 */

import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

// Map of variant names → Tailwind classes for background/text/hover colours
const VARIANTS = {
  brand:   'bg-[#171717] text-white hover:bg-[#2a2a2a]',
  outline: 'border border-[#EAEAE5] bg-white text-[#171717] hover:bg-[#F5F5F3]',
  ghost:   'text-[#525252] hover:text-[#171717] hover:bg-[#F5F5F3]',
  danger:  'bg-[#B85A3C] text-white hover:bg-[#a04f34]',
  success: 'bg-[#2B4C3F] text-white hover:bg-[#3D6B59]',
};

// Map of size names → Tailwind height/padding/text classes
const SIZES = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
};

/** Matte button — no gradients, solid colours only. */
export function Button({
  variant = 'brand',  // which colour scheme to use
  size = 'md',        // which size to use
  loading = false,    // shows spinner + disables button when true
  disabled,           // standard HTML disabled attribute
  className,          // extra classes passed from the parent
  children,           // the button label / content
  ...props            // any other HTML button attributes (onClick, type, etc.)
}) {
  return (
    <button
      // disabled when explicitly disabled OR when a loading operation is in progress
      disabled={disabled || loading}
      className={cn(
        // Base layout: inline flex so icon + text sit side by side
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold',
        // Smooth hover animation
        'transition-all duration-200 cubic-bezier(0.16, 1, 0.3, 1)',
        // Micro-interaction: slightly lifts on hover, shrinks on click
        'hover:-translate-y-[1px] active:scale-[0.98]',
        // Keyboard accessibility: visible focus ring
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B4C3F]/40',
        // Disabled state: cursor changes, opacity fades, transform disabled
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none',
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
