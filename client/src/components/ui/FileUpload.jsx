import { useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/icons';

/**
 * Drag-and-drop / click file picker. Controlled via `file` + `onSelect`.
 * `accept` sets the input filter; `hint` describes allowed types to the user.
 */
export function FileUpload({
  file,
  onSelect,
  accept = '.pdf,.doc,.docx',
  hint = 'PDF or Word, up to 5 MB',
  existingLabel,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const pick = (f) => f && onSelect(f);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files?.[0]);
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-8 text-center transition',
          dragging
            ? 'border-brand/60 bg-brand/10'
            : 'border-line bg-surface-2/40 hover:border-brand/40 hover:bg-surface-2/70'
        )}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-brand-soft">
          <Icon.Upload size={20} />
        </span>
        {file ? (
          <p className="text-sm font-medium text-ink">{file.name}</p>
        ) : (
          <>
            <p className="text-sm font-medium text-ink">
              Drop your file here, or <span className="text-brand-soft">browse</span>
            </p>
            <p className="text-xs text-faint">{hint}</p>
          </>
        )}
      </div>

      {!file && existingLabel && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <Icon.Check size={14} className="text-success" /> {existingLabel}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}
