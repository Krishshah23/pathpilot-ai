import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/icons';

/** Horizontal progress stepper for multi-step flows. */
export function Stepper({ steps, current }) {
  return (
    <ol className="flex items-center">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition',
                  done && 'btn-brand border-transparent text-white',
                  active && 'border-brand bg-brand/15 text-brand-soft',
                  !done && !active && 'border-line bg-surface-2 text-faint'
                )}
              >
                {done ? <Icon.Check size={16} /> : i + 1}
              </span>
              <span
                className={cn(
                  'hidden text-xs sm:block',
                  active ? 'font-medium text-ink' : 'text-faint'
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'mx-2 h-0.5 flex-1 rounded-full transition',
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
