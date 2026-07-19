/**
 * components/ui/TagInput.jsx — Skills / Tags Input Component
 *
 * Lets the user build a list of tags (e.g. skills) interactively:
 *   - Type a skill name and press Enter or comma → it becomes a tag chip
 *   - Press Backspace on empty input → removes the last tag
 *   - Click the × on any tag → removes just that tag
 *   - Optional `suggestions` prop → shows quick-add chip buttons below the input
 *
 * This is used on the Onboarding wizard (Step 2 "Current Skills") and on the
 * Profile page where the user manages their skill list.
 *
 * PROPS:
 *   label       — text label above the input area
 *   value       — the current array of tag strings (controlled component)
 *   onChange    — called with the new array whenever tags change
 *   placeholder — text shown inside the input when empty
 *   suggestions — array of strings shown as quick-add chips below (e.g. COMMON_SKILLS)
 *   max         — maximum number of tags allowed (default 50)
 *   error       — red error message shown below
 *
 * USAGE:
 *   <TagInput
 *     label="Current skills"
 *     value={form.skills}
 *     onChange={(newSkills) => setForm({ ...form, skills: newSkills })}
 *     suggestions={COMMON_SKILLS}
 *   />
 */

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/icons';

export function TagInput({
  label,
  value = [],        // controlled: current list of tags
  onChange,          // called whenever the tag list changes
  placeholder = 'Type a skill and press Enter',
  suggestions = [],  // optional quick-add chips shown below the input
  max = 50,          // maximum allowed tags
  error,
}) {
  // `draft` is the text currently typed in the input field (not yet a tag)
  const [draft, setDraft] = useState('');

  /**
   * Adds a new tag from a raw string.
   * Trims whitespace, checks for duplicates (case-insensitive), and enforces max.
   */
  const add = (raw) => {
    const tag = raw.trim();
    if (!tag) return; // ignore empty strings
    // Duplicate check: compare lowercased to ignore case differences
    const exists = value.some((t) => t.toLowerCase() === tag.toLowerCase());
    if (exists || value.length >= max) return;
    onChange([...value, tag]); // add the new tag and notify parent
    setDraft('');              // clear the input
  };

  /** Removes a specific tag from the list */
  const remove = (tag) => onChange(value.filter((t) => t !== tag));

  /**
   * Keyboard handler for the text input:
   *   Enter or comma → add the current draft as a tag
   *   Backspace on empty input → remove the last tag
   */
  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault(); // prevent form submit on Enter, prevent comma appearing
      add(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      remove(value[value.length - 1]); // remove last tag when input is empty
    }
  };

  // Filter suggestions: only show ones the user hasn't already added
  const openSuggestions = suggestions.filter(
    (s) => !value.some((t) => t.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-muted">{label}</label>}

      {/* Tag container — acts as a visual input box.
          focus-within: applies border highlight when the inner <input> is focused */}
      <div
        className={cn(
          'flex min-h-11 flex-wrap items-center gap-2 rounded-xl border bg-surface-2/60 p-2',
          error ? 'border-danger/60' : 'border-line focus-within:border-brand/60'
        )}
      >
        {/* Render each existing tag as a chip with an × remove button */}
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

        {/* The actual text input — invisible (bg-transparent), grows to fill space */}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(draft)} // also add when the user clicks away
          placeholder={value.length ? '' : placeholder} // hide placeholder once tags exist
          className="min-w-[8rem] flex-1 bg-transparent px-1 text-sm text-ink placeholder:text-faint focus:outline-none"
        />
      </div>

      {/* Footer: error message OR tag count */}
      <div className="flex items-center justify-between">
        {error ? (
          <span className="text-xs text-danger">{error}</span>
        ) : (
          <span className="text-xs text-faint">
            {value.length}/{max} skills
          </span>
        )}
      </div>

      {/* Quick-add suggestion chips — click to instantly add without typing */}
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
