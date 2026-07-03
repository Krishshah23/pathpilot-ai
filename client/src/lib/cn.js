/**
 * Tiny className combiner (avoids a clsx dependency). Filters falsy values and
 * joins the rest with spaces.
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
