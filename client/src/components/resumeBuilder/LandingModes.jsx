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
import { Icon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/Spinner';

const MODES = [
  {
    key: 'scratch',
    icon: <Icon.FileText size={22} />,
    title: 'Create from Scratch',
    desc: "No resume yet? Start with a blank guided editor — AI helps you write strong bullets as you go.",
    cta: 'Start Blank',
  },
  {
    key: 'import',
    icon: <Icon.Download size={22} />,
    title: 'Import & Edit Mine',
    desc: 'Already uploaded a resume on PathPilot? One click pulls in your parsed skills, experience, and projects.',
    cta: 'Import My Resume',
  },
  {
    key: 'migrate',
    icon: <Icon.Route size={22} />,
    title: 'Migrate to Our Template',
    desc: 'Have a PDF resume but want a cleaner design? Upload it and we\'ll drop the same content into a professional template.',
    cta: 'Upload PDF',
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

      <div className="grid gap-5 sm:grid-cols-3">
        {MODES.map((m) => {
          const isPending = initializing && pendingMode === m.key;
          return (
            <button
              key={m.key}
              onClick={() => handleClick(m.key)}
              disabled={initializing}
              className="group text-left rounded-2xl border border-line bg-surface p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-brand/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-ink border border-line transition-colors duration-300 group-hover:bg-brand group-hover:text-white">
                {m.icon}
              </div>
              <h3 className="text-sm font-bold text-ink mt-4">{m.title}</h3>
              <p className="text-xs text-muted mt-1.5 leading-relaxed">{m.desc}</p>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand mt-4">
                {isPending ? <Spinner className="h-3.5 w-3.5" /> : null}
                {isPending ? 'Setting up…' : m.cta}
                {!isPending && <Icon.ArrowRight size={13} />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
