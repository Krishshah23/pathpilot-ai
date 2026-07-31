/**
 * components/FAQSection.jsx — Collapsible FAQ Accordion (Task 5)
 *
 * Reused in two places (see faqData.js for the shared content):
 *   - AuthLayout's brand panel (a short `limit`-ed preview)
 *   - The standalone /faq page (full list)
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '@/components/ui/icons';
import { FAQ_ITEMS } from '@/config/faqData';
import { cn } from '@/lib/cn';

export function FAQSection({ limit, dark = false, className }) {
  const [openIndex, setOpenIndex] = useState(null);
  const items = limit ? FAQ_ITEMS.slice(0, limit) : FAQ_ITEMS;

  return (
    <div className={cn('space-y-2.5', className)}>
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={item.q}
            className={cn(
              'rounded-xl border overflow-hidden transition-colors',
              dark
                ? cn('border-white/10 bg-white/5', isOpen && 'border-brand/50')
                : cn('border-line bg-surface', isOpen && 'border-brand/40')
            )}
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className={cn(
                'w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-semibold',
                dark ? 'text-white' : 'text-ink'
              )}
            >
              {item.q}
              <Icon.ChevronDown
                size={15}
                className={cn('shrink-0 transition-transform duration-200', dark ? 'text-white/50' : 'text-faint', isOpen && 'rotate-180')}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className={cn('px-4 pb-4 text-xs leading-relaxed', dark ? 'text-white/60' : 'text-muted')}>
                    {item.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
