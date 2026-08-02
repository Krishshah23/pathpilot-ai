/**
 * components/resumeBuilder/Editor.jsx — Resume Builder Split-Panel Editor
 *
 * Left panel: section-by-section editor (Contact, Summary, Experience, Skills,
 * Projects, Education) plus the collapsible JD Matcher.
 * Right panel: live preview (re-renders instantly on template switch) with the
 * ATS Score panel pinned above it.
 *
 * AUTOSAVE: edits update local state immediately (so typing feels instant) and
 * are PATCHed to the server on a short debounce. The server recomputes the ATS
 * score on every save and the response updates the sidebar — this is what makes
 * the ATS score feel "live" without a network round-trip per keystroke.
 */

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/Spinner';
import { SkillTagInput } from '@/components/layout/AppShell';
import { AtsPanel } from '@/components/resumeBuilder/AtsPanel';
import { JdMatcher } from '@/components/resumeBuilder/JdMatcher';
import { TemplateSwitcher } from '@/components/resumeBuilder/TemplateSwitcher';
import { TEMPLATES } from '@/components/resumeBuilder/templates';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/cn';

const TEMPLATE_OPTIONS = [
  { key: 'minimal', label: 'Minimal' },
  { key: 'modern', label: 'Modern' },
  { key: 'classic', label: 'Classic' },
];

const emptyExperience = () => ({ title: '', company: '', location: '', startDate: '', endDate: '', current: false, bullets: [] });
const emptyProject = () => ({ title: '', link: '', bullets: [] });
const emptyEducation = () => ({ degree: '', institution: '', location: '', startDate: '', endDate: '', gpa: '' });

/**
 * Locates the experience/bullet indices for an AI optimize-scan rewrite.
 * The `id` (e.g. "0-2") is a direct pointer into the same numbered bullet list
 * Gemini was shown, so it's trusted first. Gemini's echoed "original" text is
 * often a paraphrase rather than a verbatim copy, so it's only used as a fuzzy
 * (normalized, case-insensitive) fallback if the id no longer resolves — e.g.
 * bullets were added/removed between the scan and clicking Apply.
 */
function findBulletLocation(experience, id, originalText) {
  const [expIdx, bulletIdx] = (id || '').split('-').map(Number);
  if (Number.isInteger(expIdx) && Number.isInteger(bulletIdx) && experience[expIdx]?.bullets[bulletIdx] !== undefined) {
    return { expIdx, bulletIdx };
  }
  const normalize = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const target = normalize(originalText);
  for (let ei = 0; ei < experience.length; ei++) {
    const bi = experience[ei].bullets.findIndex((b) => normalize(b) === target);
    if (bi !== -1) return { expIdx: ei, bulletIdx: bi };
  }
  return null;
}

export function Editor({ resumeBuilder, setResumeBuilder, onSwitchMode, initializing, onBack }) {
  const toast = useToast();
  const [doc, setDoc] = useState(resumeBuilder);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false); // true while an edit hasn't been confirmed saved yet
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [optimizing, setOptimizing] = useState(null); // optimize scan result | null
  const [rewritingId, setRewritingId] = useState(null); // `${section}-${entryIdx}-${bulletIdx}` while a rewrite is in flight
  const [insertingKeywords, setInsertingKeywords] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [zoom, setZoom] = useState(0.6);

  const saveTimer = useRef(null);
  const docRef = useRef(doc);
  const isSavingRef = useRef(false);

  // Keep docRef synced with local doc
  docRef.current = doc;

  // Only sync from props if initial document ID changes (loaded/switched)
  useEffect(() => {
    if (resumeBuilder && resumeBuilder._id !== docRef.current?._id) {
      setDoc(resumeBuilder);
      docRef.current = resumeBuilder;
    }
  }, [resumeBuilder]);

  // Debounced autosave — PATCHes the whole doc, server recomputes ATS score.
  const scheduleSave = (nextDoc) => {
    setDoc(nextDoc);
    docRef.current = nextDoc;
    setDirty(true);

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      isSavingRef.current = true;
      try {
        const payload = docRef.current;
        const { data } = await api.patch('/resume-builder', {
          template: payload.template,
          contact: payload.contact,
          summary: payload.summary,
          experience: payload.experience,
          skills: payload.skills,
          projects: payload.projects,
          education: payload.education,
        });
        const serverDoc = data.data.resumeBuilder;
        setResumeBuilder(serverDoc);

        // Update ATS score in local doc without overwriting active user typing
        setDoc((current) => ({
          ...current,
          atsScore: serverDoc?.atsScore ?? current.atsScore,
        }));
        if (docRef.current) {
          docRef.current = {
            ...docRef.current,
            atsScore: serverDoc?.atsScore ?? docRef.current.atsScore,
          };
        }
        setDirty(false);
      } catch (err) {
        toast.error(errorMessage(err, 'Failed to save'));
      } finally {
        setSaving(false);
        isSavingRef.current = false;
      }
    }, 800);
  };

  const handleBack = () => {
    if ((dirty || saving) && !window.confirm('You have unsaved changes that are still saving. Leave anyway?')) {
      return;
    }
    onBack();
  };

  const update = (patch) => scheduleSave({ ...doc, ...patch });
  const updateContact = (field, value) => update({ contact: { ...doc.contact, [field]: value } });

  const generateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const { data } = await api.post('/resume-builder/ai/generate-summary');
      setDoc(data.data.resumeBuilder);
      setResumeBuilder(data.data.resumeBuilder);
      toast.success('Summary generated');
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to generate summary'));
    } finally {
      setGeneratingSummary(false);
    }
  };

  const rewriteBullet = async (getBullet, setBullet, id) => {
    setRewritingId(id);
    try {
      const { data } = await api.post('/resume-builder/ai/rewrite-bullet', { bullet: getBullet() });
      setBullet(data.data.rewritten);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to rewrite bullet'));
    } finally {
      setRewritingId(null);
    }
  };

  const runOptimize = async () => {
    setOptimizing({ loading: true });
    try {
      const { data } = await api.post('/resume-builder/ai/optimize');
      setOptimizing({ loading: false, ...data.data });
    } catch (err) {
      toast.error(errorMessage(err, 'Optimization scan failed'));
      setOptimizing(null);
    }
  };

  const applyBulletRewrite = (rewrite) => {
    const location = findBulletLocation(doc.experience, rewrite.id, rewrite.original);
    if (!location) {
      toast.error('Could not locate that bullet — it may have already been edited.');
      return;
    }
    const { expIdx, bulletIdx } = location;
    const experience = doc.experience.map((e, i) =>
      i === expIdx ? { ...e, bullets: e.bullets.map((b, bi) => (bi === bulletIdx ? rewrite.rewritten : b)) } : e
    );
    update({ experience });
    setOptimizing((prev) => prev && { ...prev, bulletRewrites: prev.bulletRewrites.filter((r) => r.id !== rewrite.id) });
  };

  const matchJd = async (jobDescription) => {
    const { data } = await api.post('/resume-builder/ai/match-jd', { jobDescription });
    return data.data;
  };

  const insertKeywords = async (keywords) => {
    setInsertingKeywords(true);
    try {
      const { data } = await api.post('/resume-builder/ai/insert-keywords', { keywords });
      setDoc(data.data.resumeBuilder);
      setResumeBuilder(data.data.resumeBuilder);
      toast.success('Summary updated with new keywords');
      setOptimizing((prev) =>
        prev && {
          ...prev,
          keywordSuggestions: (prev.keywordSuggestions || []).filter((k) => !keywords.includes(k)),
        }
      );
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to insert keywords'));
    } finally {
      setInsertingKeywords(false);
    }
  };

  const runExport = async (format) => {
    setExporting(format);
    try {
      const res = await api.get(`/resume-builder/export/${format}`, { responseType: 'blob' });
      const blob = new Blob([res.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(doc.contact.name || 'resume').replace(/\s+/g, '_')}.${format === 'text' ? 'txt' : format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(errorMessage(err, 'Export failed'));
    } finally {
      setExporting(null);
    }
  };

  const Preview = TEMPLATES[doc.template] || TEMPLATES.minimal;

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            title="Back to start"
            aria-label="Back to start"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line text-muted hover:bg-surface-2 hover:text-ink transition-colors"
          >
            <Icon.ChevronLeft size={16} />
          </button>
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink">Resume Builder</h1>
            <p className="text-xs text-muted mt-1 flex items-center gap-1.5">
              {saving ? <><Spinner className="h-3 w-3" /> Saving…</> : dirty ? 'Unsaved changes' : 'All changes saved'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TemplateSwitcher template={doc.template} doc={doc} onSelect={(key) => update({ template: key })} />
          <button
            onClick={runOptimize}
            disabled={optimizing?.loading}
            className="h-9 px-4 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-soft disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {optimizing?.loading ? <Spinner className="h-3.5 w-3.5" /> : <Icon.Sparkles size={13} />} Optimize Resume
          </button>
          <ExportMenu onExport={runExport} exporting={exporting} />
          <ModeSwitcher onSwitchMode={onSwitchMode} initializing={initializing} />
        </div>
      </div>

      {optimizing && !optimizing.loading && (
        <OptimizeResults
          result={optimizing}
          onApplyBullet={applyBulletRewrite}
          onApplyKeywords={insertKeywords}
          applyingKeywords={insertingKeywords}
          onDismiss={() => setOptimizing(null)}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        {/* Left: section editor */}
        <div className="space-y-5">
          <ContactSection contact={doc.contact} onChange={updateContact} />
          <SummarySection
            summary={doc.summary}
            onChange={(summary) => update({ summary })}
            onGenerate={generateSummary}
            generating={generatingSummary}
          />
          <ExperienceSection
            experience={doc.experience}
            onChange={(experience) => update({ experience })}
            onRewrite={rewriteBullet}
            rewritingId={rewritingId}
          />
          <SkillsSection skills={doc.skills} missingKeywords={doc.atsScore?.missingKeywords} onChange={(skills) => update({ skills })} />
          <ProjectsSection projects={doc.projects} onChange={(projects) => update({ projects })} onRewrite={rewriteBullet} rewritingId={rewritingId} />
          <EducationSection education={doc.education} onChange={(education) => update({ education })} />
          <JdMatcher onMatch={matchJd} onInsertKeywords={insertKeywords} applying={insertingKeywords} />
        </div>

        {/* Right: ATS panel + live preview */}
        <div className="space-y-5 lg:sticky lg:top-24 self-start">
          <AtsPanel atsScore={doc.atsScore} />
          <div className="apple-card-lg card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-line bg-surface-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-faint">Live Preview · {TEMPLATE_OPTIONS.find((t) => t.key === doc.template)?.label}</p>
              <div className="apple-segmented shrink-0">
                <button
                  onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))}
                  aria-label="Zoom out"
                  className="apple-segmented-item h-6 w-6 flex items-center justify-center text-faint hover:text-ink"
                >
                  −
                </button>
                <span className="px-1.5 text-[10px] font-mono font-semibold text-muted tabular-nums w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom((z) => Math.min(1.2, +(z + 0.1).toFixed(2)))}
                  aria-label="Zoom in"
                  className="apple-segmented-item h-6 w-6 flex items-center justify-center text-faint hover:text-ink"
                >
                  +
                </button>
              </div>
            </div>
            <div className="max-h-[900px] overflow-auto bg-surface-2 p-6">
              <div
                className="mx-auto shadow-[0_8px_24px_-8px_rgba(0,0,0,0.25)] transition-[zoom] duration-200"
                style={{ width: '640px', zoom }}
              >
                <Preview doc={doc} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Export menu ── */
function ExportMenu({ onExport, exporting }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="h-9 px-4 rounded-xl border border-line text-xs font-semibold text-ink hover:bg-surface-2 transition-colors flex items-center gap-1.5"
      >
        <Icon.Download size={13} /> Export
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-40 rounded-xl border border-line bg-surface shadow-lg z-20 p-1.5">
          {[{ key: 'pdf', label: 'PDF' }, { key: 'docx', label: 'DOCX' }, { key: 'text', label: 'Plain Text' }].map((f) => (
            <button
              key={f.key}
              onMouseDown={(e) => { e.preventDefault(); onExport(f.key); }}
              disabled={!!exporting}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted hover:text-ink hover:bg-surface-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {exporting === f.key ? <Spinner className="h-3 w-3" /> : null} {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ModeSwitcher({ onSwitchMode, initializing }) {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef(null);
  return (
    <div className="relative">
      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) onSwitchMode('migrate', file);
        e.target.value = '';
      }} />
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        disabled={initializing}
        aria-label="Start over from a different mode"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Start over from a different mode"
        className="h-9 px-3 rounded-xl border border-line text-xs font-semibold text-muted hover:bg-surface-2 transition-colors flex items-center gap-1"
      >
        <Icon.RotateCw size={13} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-line bg-surface shadow-lg z-20 p-1.5">
          <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-faint">Start over from</p>
          <button onMouseDown={(e) => { e.preventDefault(); onSwitchMode('scratch'); }} className="w-full text-left px-3 py-2 text-xs font-medium text-muted hover:text-ink hover:bg-surface-2 rounded-lg">Blank editor</button>
          <button onMouseDown={(e) => { e.preventDefault(); onSwitchMode('import'); }} className="w-full text-left px-3 py-2 text-xs font-medium text-muted hover:text-ink hover:bg-surface-2 rounded-lg">Re-import my resume</button>
          <button onMouseDown={(e) => { e.preventDefault(); fileInputRef.current?.click(); }} className="w-full text-left px-3 py-2 text-xs font-medium text-muted hover:text-ink hover:bg-surface-2 rounded-lg">Migrate a new PDF</button>
        </div>
      )}
    </div>
  );
}

/* ── Optimize scan results banner ── */
function OptimizeResults({ result, onApplyBullet, onApplyKeywords, applyingKeywords, onDismiss }) {
  const hasContent = result.bulletRewrites?.length || result.keywordSuggestions?.length || result.redFlags?.length;
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink flex items-center gap-2"><Icon.Sparkles size={15} className="text-muted" /> AI Optimization Scan</h3>
        <button onClick={onDismiss} aria-label="Dismiss optimization results" className="text-faint hover:text-ink"><Icon.X size={16} /></button>
      </div>
      {!hasContent && <p className="text-xs text-muted">No issues found — your resume looks solid.</p>}
      {result.summaryFeedback && <p className="text-xs text-muted italic">{result.summaryFeedback}</p>}
      {result.redFlags?.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-danger mb-1.5">Red Flags</p>
          <ul className="space-y-1">{result.redFlags.map((f, i) => <li key={i} className="text-xs text-muted flex gap-1.5"><Icon.AlertTriangle size={12} className="text-danger shrink-0 mt-0.5" />{f}</li>)}</ul>
        </div>
      )}
      {result.keywordSuggestions?.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-faint">Keyword Suggestions</p>
            <button
              onClick={() => onApplyKeywords(result.keywordSuggestions)}
              disabled={applyingKeywords}
              className="text-[11px] font-semibold text-brand hover:underline disabled:opacity-50 flex items-center gap-1"
            >
              {applyingKeywords && <Spinner className="h-3 w-3" />} Apply to summary
            </button>
          </div>
          <div className="flex flex-wrap gap-1">{result.keywordSuggestions.map((k) => <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-muted">{k}</span>)}</div>
        </div>
      )}
      {result.bulletRewrites?.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-faint">Suggested Bullet Rewrites</p>
          {result.bulletRewrites.map((r) => (
            <div key={r.id} className="rounded-lg border border-line p-3">
              <p className="text-[11px] text-faint line-through">{r.original}</p>
              <p className="text-xs text-ink mt-1">{r.rewritten}</p>
              <button onClick={() => onApplyBullet(r)} className="mt-2 text-[11px] font-semibold text-brand hover:underline">Apply</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Contact ── */
function ContactSection({ contact, onChange }) {
  const fields = [
    ['name', 'Full Name'], ['email', 'Email'], ['phone', 'Phone'], ['location', 'Location'],
    ['linkedin', 'LinkedIn'], ['github', 'GitHub'], ['website', 'Website'],
  ];
  return (
    <div className="card p-5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-faint mb-4">Contact Info</h3>
      <div className="grid grid-cols-2 gap-3">
        {fields.map(([key, label]) => (
          <input
            key={key}
            value={contact[key] || ''}
            onChange={(e) => onChange(key, e.target.value)}
            placeholder={label}
            className="input text-sm"
          />
        ))}
      </div>
    </div>
  );
}

/* ── Summary ── */
function SummarySection({ summary, onChange, onGenerate, generating }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-faint">Professional Summary</h3>
        <button onClick={onGenerate} disabled={generating} className="text-[11px] font-semibold text-brand hover:underline disabled:opacity-50 flex items-center gap-1">
          {generating ? <Spinner className="h-3 w-3" /> : <Icon.Sparkles size={12} />} Generate with AI
        </button>
      </div>
      <textarea
        value={summary}
        onChange={(e) => onChange(e.target.value)}
        placeholder="A 2-3 sentence introduction to your background and target role…"
        className="input w-full min-h-[90px] resize-none text-sm"
      />
    </div>
  );
}

function AutoResizingTextarea({ value, onChange, className, ...props }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      className={className}
      {...props}
    />
  );
}

/* ── Bullet list (shared by Experience + Projects) ── */
function BulletList({ bullets, onChange, onRewrite, rewritingId, idPrefix }) {
  const setBullet = (i, value) => onChange(bullets.map((b, bi) => (bi === i ? value : b)));
  const removeBullet = (i) => onChange(bullets.filter((_, bi) => bi !== i));
  const addBullet = () => onChange([...bullets, '']);

  return (
    <div className="space-y-1.5 mt-2">
      {bullets.map((b, i) => {
        const id = `${idPrefix}-${i}`;
        return (
          <div key={i} className="flex items-start gap-1.5">
            <AutoResizingTextarea
              value={b}
              onChange={(e) => setBullet(i, e.target.value)}
              rows={1}
              className="flex-1 min-h-[38px] rounded-xl border border-line bg-surface px-3 py-2 text-xs leading-relaxed text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors resize-none overflow-hidden"
            />
            <button
              onClick={() => onRewrite(() => bullets[i], (v) => setBullet(i, v), id)}
              disabled={rewritingId === id}
              title="Rewrite with AI"
              aria-label="Rewrite this bullet with AI"
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg border border-line text-faint hover:text-brand hover:border-brand/40 transition-colors"
            >
              {rewritingId === id ? <Spinner className="h-3.5 w-3.5" /> : <Icon.Sparkles size={13} />}
            </button>
            <button
              onClick={() => removeBullet(i)}
              aria-label="Remove this bullet"
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-faint hover:text-danger"
            >
              <Icon.X size={14} />
            </button>
          </div>
        );
      })}
      <button onClick={addBullet} className="text-[11px] font-semibold text-brand hover:underline flex items-center gap-1 mt-1">
        <Icon.Plus size={12} /> Add bullet
      </button>
    </div>
  );
}

/* ── Experience ── */
function ExperienceSection({ experience, onChange, onRewrite, rewritingId }) {
  const setEntry = (i, patch) => onChange(experience.map((e, ei) => (ei === i ? { ...e, ...patch } : e)));
  const removeEntry = (i) => onChange(experience.filter((_, ei) => ei !== i));
  const addEntry = () => onChange([...experience, emptyExperience()]);

  return (
    <div className="card p-5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-faint mb-4">Work Experience</h3>
      <div className="space-y-4">
        {experience.map((e, i) => (
          <div key={i} className="rounded-xl border border-line p-4">
            <div className="flex justify-end">
              <button onClick={() => removeEntry(i)} aria-label="Remove this experience entry" className="text-faint hover:text-danger"><Icon.Trash size={13} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <input value={e.title} onChange={(ev) => setEntry(i, { title: ev.target.value })} placeholder="Job Title" className="input text-sm" />
              <input value={e.company} onChange={(ev) => setEntry(i, { company: ev.target.value })} placeholder="Company" className="input text-sm" />
              <input value={e.startDate} onChange={(ev) => setEntry(i, { startDate: ev.target.value })} placeholder="Start (e.g. Jun 2024)" className="input text-sm" />
              <input value={e.endDate} onChange={(ev) => setEntry(i, { endDate: ev.target.value })} placeholder="End" disabled={e.current} className="input text-sm disabled:opacity-50" />
            </div>
            <label className="flex items-center gap-1.5 mt-2 text-xs text-muted">
              <input type="checkbox" checked={e.current} onChange={(ev) => setEntry(i, { current: ev.target.checked })} /> Currently working here
            </label>
            <BulletList bullets={e.bullets} onChange={(bullets) => setEntry(i, { bullets })} onRewrite={onRewrite} rewritingId={rewritingId} idPrefix={`exp-${i}`} />
          </div>
        ))}
      </div>
      <button onClick={addEntry} className="mt-3 text-xs font-semibold text-brand hover:underline flex items-center gap-1">
        <Icon.Plus size={13} /> Add experience
      </button>
    </div>
  );
}

/* ── Skills ── */
function SkillsSection({ skills, missingKeywords, onChange }) {
  const missing = (missingKeywords || []).filter((k) => !skills.some((s) => s.toLowerCase() === k.toLowerCase())).slice(0, 6);
  return (
    <div className="card p-5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-faint mb-3">Skills</h3>
      <SkillTagInput skills={skills} onChange={onChange} />
      {missing.length > 0 && (
        <div className="mt-3 flex items-start gap-1.5 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2">
          <Icon.AlertTriangle size={13} className="text-danger shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted leading-relaxed">
            Missing in-demand skills for your target role: <span className="font-semibold text-ink">{missing.join(', ')}</span>
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Projects ── */
function ProjectsSection({ projects, onChange, onRewrite, rewritingId }) {
  const setEntry = (i, patch) => onChange(projects.map((p, pi) => (pi === i ? { ...p, ...patch } : p)));
  const removeEntry = (i) => onChange(projects.filter((_, pi) => pi !== i));
  const addEntry = () => onChange([...projects, emptyProject()]);

  return (
    <div className="card p-5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-faint mb-4">Projects</h3>
      <div className="space-y-4">
        {projects.map((p, i) => (
          <div key={i} className="rounded-xl border border-line p-4">
            <div className="flex justify-end">
              <button onClick={() => removeEntry(i)} aria-label="Remove this project" className="text-faint hover:text-danger"><Icon.Trash size={13} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <input value={p.title} onChange={(ev) => setEntry(i, { title: ev.target.value })} placeholder="Project Title" className="input text-sm" />
              <input value={p.link} onChange={(ev) => setEntry(i, { link: ev.target.value })} placeholder="Link (optional)" className="input text-sm" />
            </div>
            <BulletList bullets={p.bullets} onChange={(bullets) => setEntry(i, { bullets })} onRewrite={onRewrite} rewritingId={rewritingId} idPrefix={`proj-${i}`} />
          </div>
        ))}
      </div>
      <button onClick={addEntry} className="mt-3 text-xs font-semibold text-brand hover:underline flex items-center gap-1">
        <Icon.Plus size={13} /> Add project
      </button>
    </div>
  );
}

/* ── Education ── */
function EducationSection({ education, onChange }) {
  const setEntry = (i, patch) => onChange(education.map((e, ei) => (ei === i ? { ...e, ...patch } : e)));
  const removeEntry = (i) => onChange(education.filter((_, ei) => ei !== i));
  const addEntry = () => onChange([...education, emptyEducation()]);

  return (
    <div className="card p-5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-faint mb-4">Education</h3>
      <div className="space-y-3">
        {education.map((e, i) => (
          <div key={i} className="rounded-xl border border-line p-4">
            <div className="flex justify-end">
              <button onClick={() => removeEntry(i)} aria-label="Remove this education entry" className="text-faint hover:text-danger"><Icon.Trash size={13} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <input value={e.degree} onChange={(ev) => setEntry(i, { degree: ev.target.value })} placeholder="Degree" className="input text-sm" />
              <input value={e.institution} onChange={(ev) => setEntry(i, { institution: ev.target.value })} placeholder="Institution" className="input text-sm" />
              <input value={e.startDate} onChange={(ev) => setEntry(i, { startDate: ev.target.value })} placeholder="Start Year" className="input text-sm" />
              <input value={e.endDate} onChange={(ev) => setEntry(i, { endDate: ev.target.value })} placeholder="End Year" className="input text-sm" />
            </div>
          </div>
        ))}
      </div>
      <button onClick={addEntry} className="mt-3 text-xs font-semibold text-brand hover:underline flex items-center gap-1">
        <Icon.Plus size={13} /> Add education
      </button>
    </div>
  );
}
