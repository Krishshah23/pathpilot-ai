/**
 * components/ui/Stepper.jsx — Multi-Step Progress Indicator
 *
 * A horizontal step indicator used in multi-page wizard flows.
 * Currently used on the Onboarding page (Step 1: Goal → Step 2: Skills).
 *
 * Each step renders as a numbered circle that transitions through three states:
 *   done   — completed step: dark filled circle with a ✓ checkmark
 *   active — current step:   brand-coloured ring with the step number
 *   future — upcoming step:  grey with the step number
 *
 * Between steps, a horizontal line connects them. Completed lines turn brand-coloured.
 *
 * PROPS:
 *   steps   — array of step label strings, e.g. ['Goal', 'Skills']
 *   current — index (0-based) of the step currently being shown
 *
 * USAGE:
 *   const STEPS = ['Goal', 'Skills'];
 *   <Stepper steps={STEPS} current={step} />
 *   // When step=0: Step 1 active, Step 2 future
 *   // When step=1: Step 1 done, Step 2 active
 */

import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/icons';

/** Horizontal progress stepper for multi-step flows. */
export function Stepper({ steps, current }) {
  return (
    // <ol> (ordered list) is semantically correct for numbered steps
    <ol className="flex items-center">
      {steps.map((label, i) => {
        const done   = i < current;  // this step has already been completed
        const active = i === current; // this is the step currently shown

        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              {/* Step number circle — changes style based on done/active/future */}
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition',
                  done   && 'btn-brand border-transparent text-white',          // dark filled
                  active && 'border-brand bg-brand/15 text-brand-soft',         // brand ring
                  !done && !active && 'border-line bg-surface-2 text-faint'     // grey
                )}
              >
                {/* Show checkmark icon for completed steps, number for others */}
                {done ? <Icon.Check size={16} /> : i + 1}
              </span>

              {/* Step label — hidden on mobile to save space (sm:block shows on sm+) */}
              <span
                className={cn(
                  'hidden text-xs sm:block',
                  active ? 'font-medium text-ink' : 'text-faint'
                )}
              >
                {label}
              </span>
            </div>

            {/* Connector line between steps — skip after the last step */}
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'mx-2 h-0.5 flex-1 rounded-full transition',
                  // Line turns brand colour once the step to its left is done
                  i < current ? 'bg-brand' : 'bg-line'
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
