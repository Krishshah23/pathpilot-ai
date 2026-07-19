/**
 * components/ui/Card.jsx — Reusable Card Container
 *
 * A simple white rounded box used to group related content on a page.
 * Almost every section on the dashboard, resume page, and roadmap uses a Card.
 *
 * The `card` CSS class is defined in index.css and applies:
 *   - background: white
 *   - border: 1px solid the warm gray border colour
 *   - rounded-2xl corners (large rounding)
 *   - p-6 (24px padding on all sides)
 *
 * USAGE:
 *   <Card>
 *     <h2>Section Title</h2>
 *     <p>Content goes here</p>
 *   </Card>
 *
 *   // Extra classes for custom spacing:
 *   <Card className="mt-6 col-span-2">...</Card>
 *
 * NOTE: The `glass` prop exists for legacy compatibility but is currently
 * unused — the `glass` CSS class can be added manually via `className` if needed.
 */

import { cn } from '@/lib/cn';

/** Flat white card — warm border, zero shadow. */
export function Card({ className, glass = false, children, ...props }) {
  return (
    <div
      className={cn(
        'card rounded-2xl p-6', // base card styles from index.css
        className               // any extra classes from the parent component
      )}
      {...props} // pass through onClick, id, style, data-* attributes etc.
    >
      {children}
    </div>
  );
}
