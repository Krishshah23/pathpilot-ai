import { useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/icons';

/**
 * Skills / tags input. Type and press Enter (or comma) to add; click × to
 * remove. Optional `suggestions` render as quick-add chips.
 */
export function TagInput({
  label,
  value = [],
  onChange,
  placeholder = 'Type a skill and press Enter',
  suggestions = [],
  max = 50,
  error,
}) {
  const [draft, setDraft] = useState('');

  const add = (raw) => {
    const tag = raw.trim();
    if (!tag) return;
    const exists = value.some((t) => t.toLowerCase() === tag.toLowerCase());
    if (exists || value.length >= max) return;
    onChange([...value, tag]);
    setDraft('');
  };

  const remove = (tag) => onChange(value.filter((t) => t !== tag));

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      remove(value[value.length - 1]);
    }
  };

  const openSuggestions = suggestions.filter(
    (s) => !value.some((t) => t.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-muted">{label}</label>}

      <div
        className={cn(
          'flex min-h-11 flex-wrap items-center gap-2 rounded-xl border bg-surface-2/60 p-2',
          error ? 'border-danger/60' : 'border-line focus-within:border-brand/60'
        )}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-lg bg-brand/15 px-2.5 py-1 text-xs font-medium text-brand-soft"
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="text-brand-soft/70 hover:text-ink"
              aria-label={`Remove ${tag}`}
            >
              <Icon.X size={12} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(draft)}
          placeholder={value.length ? '' : placeholder}
          className="min-w-[8rem] flex-1 bg-transparent px-1 text-sm text-ink placeholder:text-faint focus:outline-none"
        />
      </div>

      <div className="flex items-center justify-between">
        {error ? (
          <span className="text-xs text-danger">{error}</span>
        ) : (
          <span className="text-xs text-faint">
            {value.length}/{max} skills
          </span>
        )}
      </div>

      {openSuggestions.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-2">
          {openSuggestions.slice(0, 12).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="flex items-center gap-1 rounded-lg border border-dashed border-line px-2.5 py-1 text-xs text-muted transition hover:border-brand/50 hover:text-ink"
            >
              <Icon.Plus size={12} /> {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
