/**
 * components/ui/EmptyState.jsx — Empty State Placeholder Component
 *
 * Displayed when a list or dashboard section has no data to show yet.
 * Examples:
 *   - "No roadmap yet. Generate one to get started." (Skill Roadmap page)
 *   - "No jobs tracked. Add your first opportunity." (Opportunities section)
 *   - "No resume uploaded yet." (Resume section)
 *
 * Using a shared component ensures all empty states have a consistent look
 * (dashed border box, centered icon, title, description, optional action button).
 *
 * PROPS:
 *   icon        — emoji or JSX shown in the icon box (default: '✦')
 *   title       — bold heading text (required)
 *   description — smaller grey sub-text (optional)
 *   action      — a Button (or any JSX) shown below the description (optional)
 *   className   — extra classes for layout overrides
 *
 * USAGE:
 *   <EmptyState
 *     icon="📄"
 *     title="No resume yet"
 *     description="Upload your resume to get an AI-powered health score."
 *     action={<Button onClick={openUpload}>Upload Resume</Button>}
 *   />
 */

import { cn } from '@/lib/cn';

/** Reusable empty-state block for lists/dashboards with no data yet. */
export function EmptyState({ icon = '✦', title, description, action, className }) {
  return (
    <div
      className={cn(
        // Dashed border box, centered content, subtle background tint
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface-2/30 px-6 py-12 text-center',
        className
      )}
    >
      {/* Icon container — small rounded square with a subtle background */}
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-xl text-brand-soft">
        {icon}
      </div>

      {/* Title — always required */}
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>

      {/* Optional description — only rendered if the prop is provided */}
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}

      {/* Optional action — typically a <Button> to trigger the first action */}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
