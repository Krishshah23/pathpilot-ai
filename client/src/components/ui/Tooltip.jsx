/**
 * components/ui/Tooltip.jsx — Minimal Hover Tooltip
 *
 * Wraps a single child element; shows a small dark label above it on hover
 * or focus. Framer Motion fade/scale-in, no external positioning library —
 * fine for the icon-button-sized targets it's used on.
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export function Tooltip({ label, children, side = 'top' }) {
  const [open, setOpen] = useState(false);

  const positionClass =
    side === 'top'
      ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
      : side === 'bottom'
      ? 'top-full left-1/2 -translate-x-1/2 mt-2'
      : side === 'left'
      ? 'right-full top-1/2 -translate-y-1/2 mr-2'
      : 'left-full top-1/2 -translate-y-1/2 ml-2';

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.12 }}
            className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-[#0E1015] px-2 py-1 text-[10px] font-medium text-white shadow-lg ${positionClass}`}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
