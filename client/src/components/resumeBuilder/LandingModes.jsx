/**
 * components/resumeBuilder/LandingModes.jsx — Resume Builder Entry Mode Selector
 *
 * Three ways into the same shared editor:
 *   A. Create from Scratch — empty editor with guided sections
 *   B. Import & Edit Mine  — pre-populates from the candidate's already-analyzed Resume
 *   C. Migrate to Our Template — upload a PDF, we parse it into the editor
 *
 * The mode only changes how the editor is pre-populated server-side
 * (see resumeBuilder.controller.js → initResumeBuilder). All three land on
 * the exact same Editor.jsx afterward.
 */

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/Spinner';
import { fadeInUp, staggerContainer } from '@/lib/motion';

const MODES = [
  {
    key: 'scratch',
    icon: <Icon.FileText size={22} />,
    title: 'Create from Scratch',
    desc: "No resume yet? Start with a blank guided editor — AI helps you write strong bullets as you go.",
    cta: 'Start Blank',
    accent: '#40916C', // emerald
    badgeBg: 'linear-gradient(135deg, #2D6A4F, #40916C)',
  },
  {
    key: 'import',
    icon: <Icon.Download size={22} />,
    title: 'Import & Edit Mine',
    desc: 'Already uploaded a resume on PathPilot? One click pulls in your parsed skills, experience, and projects.',
    cta: 'Import My Resume',
    accent: '#3B82F6', // blue
    badgeBg: 'linear-gradient(135deg, #1D4ED8, #3B82F6)',
    badge: 'Most Popular',
  },
  {
    key: 'migrate',
    icon: <Icon.Route size={22} />,
    title: 'Migrate to Our Template',
    desc: 'Have a PDF resume but want a cleaner design? Upload it and we\'ll drop the same content into a professional template.',
    cta: 'Upload PDF',
    accent: '#8B5CF6', // violet
    badgeBg: 'linear-gradient(135deg, #6D28D9, #8B5CF6)',
  },
];

export function LandingModes({ onSelect, initializing, onContinue }) {
  const [pendingMode, setPendingMode] = useState(null);
  const fileInputRef = useRef(null);

  const handleClick = (mode) => {
    if (mode === 'migrate') {
      fileInputRef.current?.click();
      return;
    }
    setPendingMode(mode);
    onSelect(mode);
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingMode('migrate');
    onSelect('migrate', file);
    e.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      {onContinue && (
        <button
          onClick={onContinue}
          className="mb-6 flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
        >
          <Icon.ArrowRight size={12} className="rotate-180" /> Continue editing my existing resume
        </button>
      )}
      <div className="text-center mb-10">
        <h1 className="font-serif text-3xl font-bold text-ink">Resume Builder</h1>
        <p className="mt-2 text-sm text-muted max-w-xl mx-auto">
          Build, edit, or migrate your resume directly on PathPilot — with AI assistance and a live ATS score as you write.
        </p>
      </div>

      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFile} />

      <motion.div initial="hidden" animate="visible" variants={staggerContainer(0.05)} className="grid gap-5 sm:grid-cols-3">
        {MODES.map((m) => {
          const isPending = initializing && pendingMode === m.key;
          return (
            <motion.button
              key={m.key}
              variants={fadeInUp}
              onClick={() => handleClick(m.key)}
              disabled={initializing}
              className="card card-hover btn-press card-top-stripe group relative text-left p-6 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ '--stripe-color': m.accent }}
            >
              {m.badge && (
                <span
                  className="absolute top-4 right-4 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm"
                  style={{ background: m.badgeBg }}
                >
                  {m.badge}
                </span>
              )}
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm transition-all duration-300 group-hover:shadow-lg"
                style={{ background: m.badgeBg, boxShadow: `0 4px 16px -4px ${m.accent}66` }}
              >
                {m.icon}
              </div>
              <h3 className="text-sm font-bold text-ink mt-4">{m.title}</h3>
              <p className="text-xs text-muted mt-1.5 leading-relaxed">{m.desc}</p>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold mt-4" style={{ color: m.accent }}>
                {isPending ? <Spinner className="h-3.5 w-3.5" /> : null}
                {isPending ? 'Setting up…' : m.cta}
                {!isPending && <Icon.ArrowRight size={13} />}
              </span>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
