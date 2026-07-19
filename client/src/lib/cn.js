/**
 * lib/cn.js — className Combiner Utility
 *
 * A tiny helper that merges multiple CSS class strings together.
 * It filters out any falsy values (false, null, undefined, '') so you can
 * safely write conditional classes without getting extra spaces or "undefined"
 * in the DOM.
 *
 * WHY NOT use clsx / classnames npm packages?
 *   Those libraries do the same thing but add a dependency. This 1-line version
 *   is all we need since we don't use Tailwind's arbitrary variants that require
 *   `twMerge`. If the project grows complex, consider switching to `clsx`.
 *
 * USAGE EXAMPLES:
 *
 *   // Simple combination
 *   cn('text-sm', 'font-bold')
 *   // → "text-sm font-bold"
 *
 *   // Conditional class (the boolean expression may be false → gets filtered)
 *   cn('base-class', isActive && 'active-class', isError && 'error-class')
 *   // → "base-class active-class"  (when isActive=true, isError=false)
 *
 *   // Extra className prop from parent (common pattern in reusable components)
 *   cn('card rounded-2xl', className)
 *   // → "card rounded-2xl my-custom-class"
 */
export function cn(...classes) {
  // `classes` is a rest parameter — an array of all arguments passed to cn().
  // `.filter(Boolean)` removes all falsy values (false, null, undefined, '').
  // `.join(' ')` combines the remaining strings with a space between them.
  return classes.filter(Boolean).join(' ');
}
