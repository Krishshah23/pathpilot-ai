import { useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/icons';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Animated drag-and-drop file picker using Framer Motion.
 * Controlled via `file` + `onSelect`.
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

  // SVGs for the curved decorative arrows
  const LeftArrow = () => (
    <svg className="w-12 h-10 text-[#525252]/30 hidden sm:block" viewBox="0 0 48 40" fill="none">
      <path d="M4 36C4 36 24 32 32 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" />
      <path d="M28 20L32 12L39 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const RightArrow = () => (
    <svg className="w-12 h-10 text-[#525252]/30 hidden sm:block" viewBox="0 0 48 40" fill="none">
      <path d="M44 36C44 36 24 32 16 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" />
      <path d="M20 20L16 12L9 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />

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
        className="relative overflow-hidden"
      >
        <motion.div
          animate={{
            scale: dragging ? 1.02 : 1,
            backgroundColor: dragging ? '#F0F5F3' : '#FFFFFF',
            borderColor: dragging ? '#2B4C3F' : '#EAEAE5',
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition-colors duration-200'
          )}
        >
          <AnimatePresence mode="wait">
            {!file ? (
              <motion.div
                key="dropzone-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full flex flex-col items-center"
              >
                {/* ── Floating Interactive Cards Animation ── */}
                <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6 relative h-20 w-full max-w-xs">
                  {/* Left Floating Card: Contact/User Info */}
                  <motion.div
                    animate={{
                      y: dragging ? [0, 8, 0] : [0, -4, 0],
                      x: dragging ? [0, 15, 0] : 0,
                      rotate: dragging ? -6 : -12,
                    }}
                    transition={{
                      y: { repeat: Infinity, duration: 4, ease: 'easeInOut' },
                      default: { type: 'spring', stiffness: 200, damping: 15 }
                    }}
                    className="absolute left-4 sm:left-8 bg-white border border-[#EAEAE5] rounded-xl p-2.5 shadow-sm flex items-center justify-center z-10 w-12 h-12"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#2B4C3F]/10 text-[#2B4C3F] flex items-center justify-center">
                      <Icon.User size={14} />
                    </div>
                  </motion.div>

                  {/* Decorative Left Arrow */}
                  <div className="absolute left-[30%] top-6 z-0">
                    <LeftArrow />
                  </div>

                  {/* Center Floating Card: The Main Resume Document */}
                  <motion.div
                    animate={{
                      y: dragging ? [0, 12, 0] : [0, -6, 0],
                      scale: dragging ? 1.15 : 1,
                    }}
                    transition={{
                      y: { repeat: Infinity, duration: 3.5, ease: 'easeInOut', delay: 0.3 },
                      default: { type: 'spring', stiffness: 200, damping: 15 }
                    }}
                    className="absolute bg-white border-2 border-[#171717] rounded-xl p-3 shadow-md flex flex-col gap-1.5 z-20 w-16 h-20 items-center justify-center"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#171717]/10 text-[#171717] flex items-center justify-center mb-1">
                      <Icon.FileText size={18} />
                    </div>
                    {/* Simulated page text lines */}
                    <div className="w-8 h-1 bg-[#EAEAE5] rounded" />
                    <div className="w-6 h-1 bg-[#EAEAE5] rounded" />
                  </motion.div>

                  {/* Decorative Right Arrow */}
                  <div className="absolute right-[30%] top-6 z-0">
                    <RightArrow />
                  </div>

                  {/* Right Floating Card: Skills Check / Readiness Shield */}
                  <motion.div
                    animate={{
                      y: dragging ? [0, 8, 0] : [0, -4, 0],
                      x: dragging ? [0, -15, 0] : 0,
                      rotate: dragging ? 6 : 12,
                    }}
                    transition={{
                      y: { repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 0.6 },
                      default: { type: 'spring', stiffness: 200, damping: 15 }
                    }}
                    className="absolute right-4 sm:right-8 bg-white border border-[#EAEAE5] rounded-xl p-2.5 shadow-sm flex items-center justify-center z-10 w-12 h-12"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#92400E]/10 text-[#92400E] flex items-center justify-center">
                      <Icon.Shield size={14} />
                    </div>
                  </motion.div>
                </div>

                {/* Drag-and-Drop Guidance */}
                <p className="text-sm font-semibold text-[#171717] mb-1">
                  Drag & drop your resume, or <span className="text-[#2B4C3F] underline underline-offset-2">browse files</span>
                </p>
                <p className="text-xs text-[#A3A3A3]">{hint}</p>
              </motion.div>
            ) : (
              <motion.div
                key="selected-file-content"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className="w-full flex flex-col items-center py-4"
              >
                {/* File Icon with Sparkles */}
                <div className="relative mb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2B4C3F]/10 text-[#2B4C3F]">
                    <Icon.Document size={28} />
                  </div>
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                    className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#2B4C3F] text-white border-2 border-white shadow-sm"
                  >
                    <Icon.Check size={11} strokeWidth={3} />
                  </motion.span>
                </div>

                {/* File Information */}
                <p className="text-sm font-bold text-[#171717] max-w-[280px] truncate mb-1">
                  {file.name}
                </p>
                <p className="text-xs text-[#A3A3A3] mb-4">
                  Ready for Career Analysis
                </p>

                {/* Loading/Progress indicator simulation */}
                <div className="w-full max-w-[200px] h-1 bg-[#F5F5F3] border border-[#EAEAE5] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    className="h-full bg-[#2B4C3F] rounded-full"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {!file && existingLabel && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-[#525252]">
          <Icon.Check size={14} className="text-[#2B4C3F]" /> {existingLabel}
        </p>
      )}
    </div>
  );
}
