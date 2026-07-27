/**
 * components/resumeBuilder/TemplateSwitcher.jsx — Template Picker with Live Thumbnail Previews
 *
 * Replaces plain text pills with a popover of scaled-down live template
 * renders (the actual MinimalPreview/ModernPreview/ClassicPreview components,
 * shrunk via CSS transform so thumbnails never drift out of sync with the
 * real templates) plus a "Preview Full Size" modal per template.
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/icons';
import { TEMPLATES } from '@/components/resumeBuilder/templates';
import { cn } from '@/lib/cn';

const TEMPLATE_OPTIONS = [
  { key: 'minimal', label: 'Minimal' },
  { key: 'modern', label: 'Modern' },
  { key: 'classic', label: 'Classic' },
];

const THUMB_UNSCALED_WIDTH = 800;
const THUMB_SCALE = 0.2;

function ThumbPreview({ templateKey, doc }) {
  const Preview = TEMPLATES[templateKey];
  return (
    <div className="relative w-full overflow-hidden bg-white" style={{ height: THUMB_UNSCALED_WIDTH * THUMB_SCALE * 1.15 }}>
      <div style={{ width: THUMB_UNSCALED_WIDTH, transform: `scale(${THUMB_SCALE})`, transformOrigin: 'top left' }}>
        <Preview doc={doc} />
      </div>
    </div>
  );
}

export function TemplateSwitcher({ template, doc, onSelect }) {
  const [open, setOpen] = useState(false);
  const [previewKey, setPreviewKey] = useState(null);

  const activeLabel = TEMPLATE_OPTIONS.find((t) => t.key === template)?.label || 'Minimal';
  const FullPreview = previewKey ? TEMPLATES[previewKey] : null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="h-9 px-3 rounded-xl border border-line text-xs font-semibold text-ink hover:bg-surface-2 transition-colors flex items-center gap-1.5"
      >
        <Icon.Layers size={13} /> Template: {activeLabel}
        <Icon.ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-[calc(100vw-2rem)] max-w-[560px] rounded-xl border border-line bg-surface shadow-lg z-30 p-3 grid grid-cols-3 gap-3">
          {TEMPLATE_OPTIONS.map((t) => (
            <div
              key={t.key}
              onMouseDown={(e) => { e.preventDefault(); onSelect(t.key); setOpen(false); }}
              className={cn(
                'rounded-lg border overflow-hidden cursor-pointer transition-colors',
                template === t.key ? 'border-brand ring-2 ring-brand/20' : 'border-line hover:border-faint'
              )}
            >
              <ThumbPreview templateKey={t.key} doc={doc} />
              <div className="flex items-center justify-between px-2 py-1.5 border-t border-line bg-surface-2">
                <span className="text-[11px] font-semibold text-ink">{t.label}</span>
                <button
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewKey(t.key); }}
                  className="text-[10px] font-semibold text-brand hover:underline"
                >
                  Preview
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewKey && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
          onClick={() => setPreviewKey(null)}
        >
          <div
            className="relative max-w-2xl w-full max-h-[85vh] overflow-y-auto rounded-2xl bg-surface border border-line shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between px-5 py-3 border-b border-line bg-surface-2 z-10">
              <span className="text-sm font-bold text-ink">{TEMPLATE_OPTIONS.find((t) => t.key === previewKey)?.label} — Full Preview</span>
              <button onClick={() => setPreviewKey(null)} className="text-faint hover:text-ink" aria-label="Close preview">
                <Icon.X size={18} />
              </button>
            </div>
            {FullPreview && <FullPreview doc={doc} />}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
