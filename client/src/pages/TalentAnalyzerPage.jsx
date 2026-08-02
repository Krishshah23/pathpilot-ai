/**
 * pages/TalentAnalyzerPage.jsx — Resume Strategy & Talent Analyzer Hub Page (/talent-analyzer)
 *
 * ARCHITECTURAL ROLE:
 * Unified hub combining multi-stage Resume Analysis, Skill Gap Analysis, Recruiter Red Flag Feedback,
 * Market Demand Alignment, and Real-Time Job Search.
 *
 * 3 HUB TABS:
 * 1. AI Role Analysis: Role fit score, key gaps, ATS keywords missing, and SHAP-like signal breakdown.
 * 2. Recruiter Feedback: 5 rule-based red flag checks (contact info, clichés, metrics ratio, date formats, gaps).
 * 3. Market Alignment: Skill demand frequency percentages sourced from live Adzuna data.
 *
 * Real-time job search (TheirStack API) now lives at its own top-level page, /live-jobs.
 */

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/layout/AppShell';

import { Icon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/Spinner';
import { Skeleton, SkeletonChips } from '@/components/ui/Skeleton';
import { FileUpload } from '@/components/ui/FileUpload';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api, errorMessage, getResumeFileUrl } from '@/lib/api';
import { cn } from '@/lib/cn';
import { DREAM_ROLES } from '@/config/careerData';

const TABS = ['AI Role Analysis', 'Recruiter First Impression', 'Market Alignment'];

function AnimatedScore({ target }) {
  const [score, setScore] = useState(0);
  useEffect(() => {
    let start = 0;
    if (start === target) return;
    const duration = 800; // ms
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setScore(target);
        clearInterval(timer);
      } else {
        setScore(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return <span>{score}</span>;
}

function SHAPVisualizer({ resume }) {
  // Derive scoring factors from the actual resume data instead of
  // displaying hardcoded static percentages. Each factor reflects
  // real signals extracted from the user's resume.
  const skills = resume?.skills || [];
  const projects = resume?.projects || [];
  const experience = resume?.experience || [];
  const healthScore = resume?.healthScore || 0;

  // Compute real contribution scores (each out of its max weight)
  const skillScore = Math.min(skills.length, 10) / 10 * 100;
  const projectScore = Math.min(projects.length, 3) / 3 * 100;
  const experienceScore = experience.length > 0 ? Math.min(experience.length, 3) / 3 * 100 : 0;
  const atsScore = healthScore; // Resume health is the closest ATS proxy

  const factors = [
    {
      name: 'Skill Coverage',
      weight: Math.round(skillScore),
      maxLabel: `${skills.length} skill${skills.length !== 1 ? 's' : ''} detected`,
      color: skillScore >= 70 ? 'var(--color-brand)' : skillScore >= 40 ? 'var(--color-warning)' : 'var(--color-danger)',
    },
    {
      name: 'Project Depth',
      weight: Math.round(projectScore),
      maxLabel: `${projects.length} project${projects.length !== 1 ? 's' : ''} found`,
      color: projectScore >= 70 ? 'var(--color-brand)' : projectScore >= 40 ? 'var(--color-warning)' : 'var(--color-danger)',
    },
    {
      name: 'Experience Signals',
      weight: Math.round(experienceScore),
      maxLabel: experience.length > 0 ? `${experience.length} entr${experience.length !== 1 ? 'ies' : 'y'}` : 'None detected',
      color: experienceScore >= 70 ? 'var(--color-brand)' : experienceScore >= 40 ? 'var(--color-warning)' : 'var(--color-danger)',
    },
    {
      name: 'Resume Health (ATS)',
      weight: Math.round(atsScore),
      maxLabel: `${healthScore}/100 health score`,
      color: atsScore >= 70 ? 'var(--color-brand)' : atsScore >= 40 ? 'var(--color-warning)' : 'var(--color-danger)',
    },
  ];

  return (
    <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink">Resume Signal Breakdown</h4>
        <p className="text-[11px] text-faint mt-0.5">Derived from your actual resume data</p>
      </div>
      <div className="space-y-3">
        {factors.map((f) => (
          <div key={f.name} className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-muted">{f.name}</span>
              <span className="font-semibold" style={{ color: f.color }}>{f.weight}% · {f.maxLabel}</span>
            </div>
            <div className="h-2 w-full bg-surface-2 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${f.weight}%`, backgroundColor: f.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


/* ── Tab 0: AI Role Analysis (Gemini-powered) ── */
function AIRoleAnalysisTab({ resume, role, onOpenFix }) {
  if (!resume) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon.Sparkles size={40} className="text-line mb-4" />
      <p className="text-sm font-medium text-faint mb-1">No resume analyzed yet</p>
      <p className="text-xs text-faint">Upload a resume to unlock AI role analysis</p>
    </div>
  );

  const keyGaps = resume.keyGaps || [];
  const strengthAreas = resume.strengthAreas || [];
  const atsKeywordsMissing = resume.atsKeywordsMissing || [];
  const aiRecommendations = resume.aiRecommendations || [];
  const roleFitScore = resume.roleFitScore;
  const nextStep = resume.nextStepPriority;

  const hasInsights = keyGaps.length > 0 || strengthAreas.length > 0;

  if (!hasInsights) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon.Sparkles size={40} className="text-line mb-4" />
      <p className="text-sm font-medium text-faint mb-1">Re-analyze to get AI insights</p>
      <p className="text-xs text-faint">This resume was analyzed before the AI layer was added. Upload it again to get role-specific analysis.</p>
    </div>
  );

  const fitColor = roleFitScore >= 70 ? 'var(--color-brand)' : roleFitScore >= 45 ? 'var(--color-warning)' : 'var(--color-danger)';

  return (
    <div className="space-y-6">
      {/* Role Fit Score & SHAP Weights */}
      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        {roleFitScore != null && (
          <div className="rounded-xl border border-line p-5 flex flex-col items-center justify-center text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-faint mb-3">Role Fit Score</p>
            <div className="relative flex items-center justify-center">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="40" strokeWidth="6" fill="none" className="stroke-line" />
                <circle
                  cx="48" cy="48" r="40"
                  stroke={fitColor}
                  strokeWidth="6" fill="none" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={((100 - roleFitScore) / 100) * (2 * Math.PI * 40)}
                />
              </svg>
              <div className="absolute text-center">
                <span className="font-serif text-2xl font-black" style={{ color: fitColor }}><AnimatedScore target={roleFitScore} /></span>
                <p className="text-[9px] font-bold text-faint">/100</p>
              </div>
            </div>
            <p className="text-[10px] text-faint mt-3">Targeting {role}</p>
          </div>
        )}

        <SHAPVisualizer resume={resume} />
      </div>

      {/* Next Step Priority */}
      {nextStep && (
        <div className="flex items-start gap-3 rounded-xl border border-line bg-ink/5 p-4">
          <Icon.ArrowRight size={16} className="text-ink mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink mb-1">Top Priority Right Now</p>
            <p className="text-sm text-ink font-medium">{nextStep}</p>
          </div>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Key Gaps */}
        {keyGaps.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-danger mb-3 flex items-center gap-1.5">
              <Icon.AlertTriangle size={12} /> Key Gaps ({keyGaps.length})
            </h3>
            <div className="space-y-2">
              {keyGaps.map((gap, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold mt-0.5">{i + 1}</span>
                  <span className="text-ink">{gap}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strengths */}
        {strengthAreas.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand mb-3 flex items-center gap-1.5">
              <Icon.Check size={12} /> Strengths
            </h3>
            <div className="space-y-2">
              {strengthAreas.map((s, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-lg border border-brand/30 bg-brand/10 px-3 py-2.5 text-sm">
                  <Icon.Check size={14} className="text-brand shrink-0 mt-0.5" />
                  <span className="text-ink">{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ATS Keyword Match Heatmap & Gap Navigator Overlay */}
      {atsKeywordsMissing.length > 0 && (
        <div className="rounded-xl border border-line p-5 space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">ATS Keyword Overlay</h3>
            <p className="text-[11px] text-faint mt-0.5">Critical target keywords needed to rank highly for {role}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand mb-2">Identified Keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {(resume.skills || []).slice(0, 8).map((kw, i) => (
                  <span key={i} className="rounded-lg border border-brand/30 bg-brand/10 px-2.5 py-1 text-xs text-brand font-medium">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-danger mb-2">Missing Keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {atsKeywordsMissing.map((kw, i) => (
                  <span key={i} className="rounded-lg border border-danger/30 bg-danger/10 px-2.5 py-1 text-xs text-danger font-medium">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      {aiRecommendations.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-faint mb-3">AI Recommendations</h3>
          <ul className="space-y-2">
            {aiRecommendations.map((rec, i) => (
              <li key={i} className="flex items-start justify-between rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-muted">
                <div className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white mt-0.5">{i + 1}</span>
                  <span>{rec}</span>
                </div>
                <button
                  onClick={() => onOpenFix({
                    title: `AI Recommendation #${i + 1}`,
                    current: rec,
                    fix: rec,
                    type: 'recommendation'
                  })}
                  className="ml-4 shrink-0 text-xs font-bold text-brand hover:underline"
                >
                  Fix
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── Tab 1: Recruiter Feedback ── */

export default function TalentAnalyzerPage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [resume, setResume] = useState(null);
  const [loadingResume, setLoadingResume] = useState(true);
  const [file, setFile] = useState(null);
  const [replacing, setReplacing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [fixTarget, setFixTarget] = useState(null); // { title: string, current: string, fix: string, type: 'flag' | 'recommendation' }
  // Gap data
  const [gapData, setGapData] = useState(null);
  const [loadingGap, setLoadingGap] = useState(false);
  const [role, setRole] = useState(user?.profile?.dreamRole || (DREAM_ROLES?.[0] ?? 'Full Stack Developer'));

  // Resume version history
  const [resumeHistory, setResumeHistory] = useState([]);

  const fetchResume = async () => {
    try {
      const { data } = await api.get('/resume');
      setResume(data.data.resume);
      // Sync role state to match the latest analyzed resume's target
      if (data.data.resume?.user) {
        // also refresh history
        const histRes = await api.get('/resume/history').catch(() => null);
        if (histRes?.data?.data?.history?.length > 1) {
          setResumeHistory(histRes.data.data.history);
        }
      }
    } catch { /* no resume yet */ }
    finally { setLoadingResume(false); }
  };

  useEffect(() => {
    fetchResume();

    // Re-fetch whenever user returns to this tab (role may have been reanalyzed elsewhere)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchResume();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);


  useEffect(() => {
    if (activeTab === 2) loadGap();
  }, [activeTab, role]);

  const loadGap = async () => {
    setLoadingGap(true);
    try {
      const { data } = await api.post('/gap/analyze', { targetRole: role });
      setGapData(data.data.gap);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to analyze skill gap'));
    } finally {
      setLoadingGap(false);
    }
  };

  const analyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/resume/analyze', fd);
      setResume(data.data.resume);
      setFile(null);
      setReplacing(false);
      await refreshUser();
      toast.success('Resume analyzed!');
    } catch (err) {
      toast.error(errorMessage(err, 'Analysis failed'));
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-ink">Resume Strategy</h1>
        <p className="mt-2 text-sm text-muted">Upload your resume and analyze it against live market requirements.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
        {/* ── Left: The Document ───────────────────────────────────── */}
        <div className="space-y-4">
          {loadingResume ? (
            <div className="card flex h-64 items-center justify-center">
              <Spinner className="h-6 w-6 text-muted" />
            </div>
          ) : !resume || replacing ? (
            <UploadZone
              file={file}
              setFile={setFile}
              analyzing={analyzing}
              onAnalyze={analyze}
              onCancel={resume ? () => { setFile(null); setReplacing(false); } : null}
            />
          ) : (
            <DocumentPanel resume={resume} onReplace={() => { setFile(null); setReplacing(true); }} />
          )}

          {/* Resume score history — only visible with 2+ uploads */}
          {resumeHistory.length > 1 && (
            <ScoreHistoryCard history={resumeHistory} />
          )}
        </div>

        {/* ── Right: Tabbed Workspace ──────────────────────────────── */}
        <div className="card overflow-hidden">
          {/* Tab Bar — Apple segmented control with a sliding pill + Live Jobs CTA */}
          <div className="p-4 border-b border-line flex items-center gap-3">
            <div className="apple-segmented flex-1">
              {TABS.map((tab, i) => {
                const isActive = activeTab === i;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(i)}
                    className={cn(
                      'btn-press apple-segmented-item flex-1 py-2 px-3 text-[13px]',
                      isActive ? 'text-white' : 'text-faint hover:text-muted'
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="talent-tab-indicator"
                        className="absolute inset-0 rounded-full bg-ink"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10">{tab}</span>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 0 && <AIRoleAnalysisTab resume={resume} role={role} onOpenFix={setFixTarget} />}
            {activeTab === 1 && <RecruiterFeedbackTab resume={resume} onOpenFix={setFixTarget} />}
            {activeTab === 2 && <MarketAlignmentTab gapData={gapData} loading={loadingGap} role={role} onRefresh={loadGap} />}
          </div>
        </div>
      </div>

      {/* Slide-over Fix Helper Drawer */}
      {fixTarget && (
        <FixHelperDrawer
          target={fixTarget}
          onClose={() => setFixTarget(null)}
        />
      )}
    </AppShell>
  );
}

/* ── Upload Zone ── */

// Mirrors the real backend pipeline order (extract → parse → role-fit → recommendations →
// persist) so the wait feels like visible progress rather than a stalled spinner. The
// pipeline can take 30-60s+ on a cold Render backend, so steps advance slowly and the
// last one holds indefinitely until the request actually resolves.
const ANALYZE_STEPS = [
  'Extracting text from your resume…',
  'Parsing skills, projects & experience…',
  'Comparing against your target role…',
  'Generating personalized recommendations…',
  'Finalizing your analysis…',
];
const ANALYZE_STEP_INTERVAL_MS = 4000;

function AnalyzingProgress() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    setStep(0);
    if (ANALYZE_STEPS.length <= 1) return;
    const interval = setInterval(() => {
      setStep((s) => Math.min(s + 1, ANALYZE_STEPS.length - 1));
    }, ANALYZE_STEP_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mt-6 rounded-xl border border-line py-5 px-5">
      <div className="flex items-center justify-center gap-3 text-sm text-muted">
        <Spinner className="h-5 w-5 text-brand shrink-0" />
        <span key={step} className="animate-fade-up">{ANALYZE_STEPS[step]}</span>
      </div>
      <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div className="animate-shimmer absolute inset-0 rounded-full bg-brand/25" />
      </div>
      <p className="mt-3 text-center text-[11px] text-faint">This can take up to a minute — hang tight.</p>
    </div>
  );
}

function UploadZone({ file, setFile, analyzing, onAnalyze, onCancel }) {
  return (
    <div className="card p-8">
      <h2 className="font-serif text-base font-bold text-ink mb-1">The Document</h2>
      <p className="text-xs text-faint mb-6">Upload a text-based PDF resume for analysis.</p>
      <FileUpload file={file} onSelect={setFile} />
      {analyzing ? (
        <AnalyzingProgress />
      ) : (
        <div className="mt-6 flex gap-3">
          {onCancel && (
            <button onClick={onCancel} className="flex-1 h-10 rounded-xl border border-line text-sm font-medium text-muted hover:bg-surface-2 transition-colors">
              Cancel
            </button>
          )}
          <button
            onClick={onAnalyze}
            disabled={!file}
            className="flex-1 h-10 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-soft disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
          >
            <Icon.Sparkles size={15} /> Analyze
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Document Panel ── */
function DocumentPanel({ resume, onReplace }) {
  const viewUrl = getResumeFileUrl(resume.fileId);
  const downloadUrl = getResumeFileUrl(resume.fileId, { download: true });

  return (
    <div className="card overflow-hidden">
      {/* Paper header */}
      <div className="bg-surface-2 border-b border-line px-4 py-3.5 sm:px-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface border border-line text-muted">
            <Icon.FileText size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink truncate max-w-[130px] sm:max-w-[180px]" title={resume.originalName || 'Resume'}>
              {resume.originalName || 'Resume'}
            </p>
            <p className="text-xs text-faint truncate">{resume.wordCount} words · Score {resume.healthScore}/100</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {viewUrl && (
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink transition-colors"
              title="View original file"
            >
              <Icon.ExternalLink size={13} /> View
            </a>
          )}
          {downloadUrl && (
            <a
              href={downloadUrl}
              className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink transition-colors"
              title="Download original file"
            >
              <Icon.Download size={13} /> Download
            </a>
          )}
          <button
            onClick={onReplace}
            className="flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-soft underline underline-offset-2 transition-colors"
            title="Replace resume"
          >
            <Icon.RotateCw size={12} /> Replace
          </button>
        </div>
      </div>

      {/* Health Score */}
      <div className="px-6 py-5 border-b border-line">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-faint uppercase tracking-wider">Resume Health</span>
          <span
            className="font-serif text-2xl font-black"
            style={{ color: resume.healthScore >= 70 ? 'var(--color-brand)' : resume.healthScore >= 40 ? 'var(--color-warning)' : 'var(--color-danger)' }}
          >
            <AnimatedScore target={resume.healthScore} /><span className="text-sm text-faint font-normal">/100</span>
          </span>
        </div>
        <div className="h-2 rounded-full progress-ruler overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${resume.healthScore}%`,
              backgroundColor: resume.healthScore >= 70 ? 'var(--color-brand)' : resume.healthScore >= 40 ? 'var(--color-warning)' : 'var(--color-danger)',
            }}
          />
        </div>
      </div>



      {/* Extracted sections */}
      <div className="px-6 py-5 space-y-4 max-h-[420px] overflow-y-auto">
        <SectionList title="Skills" items={resume.skills} lowConfidence={resume.lowConfidenceFields?.includes('skills')} />
        <SectionList title="Experience" items={resume.experience} lowConfidence={resume.lowConfidenceFields?.includes('experience')} />
        <SectionList title="Education" items={resume.education} lowConfidence={resume.lowConfidenceFields?.includes('education')} />
        <SectionList title="Projects" items={resume.projects?.map((p) => p.title)} lowConfidence={resume.lowConfidenceFields?.includes('projects')} />
      </div>
    </div>
  );
}

function SectionList({ title, items, lowConfidence }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-faint mb-2 flex items-center gap-1.5">
        {title}
        {lowConfidence && (
          <span
            className="inline-flex items-center gap-1 normal-case tracking-normal font-medium text-[10px] text-warning"
            title="We weren't 100% sure about this field — please verify it's accurate."
          >
            <Icon.AlertTriangle size={10} /> Please verify
          </span>
        )}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.slice(0, 12).map((item, i) => (
          <span key={i} className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs text-muted font-medium">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Score History: click-to-pin bars with delta + date detail ── */
function ScoreHistoryCard({ history }) {
  // Server returns newest-first; reverse so the chart reads oldest → newest, left to right.
  const versions = useMemo(() => (history || []).slice().reverse(), [history]);
  const [pinnedIdx, setPinnedIdx] = useState(versions.length - 1); // default: latest version
  const scrollRef = useRef(null);

  useEffect(() => {
    setPinnedIdx(versions.length - 1);
  }, [versions.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [versions.length]);

  const selected = versions[pinnedIdx] || versions[versions.length - 1];
  const previous = pinnedIdx > 0 ? versions[pinnedIdx - 1] : null;
  const delta = previous && selected ? selected.healthScore - previous.healthScore : null;

  return (
    <div className="card p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-faint">Score History</p>
        <p className="text-[10px] text-faint">{versions.length} versions uploaded</p>
      </div>

      <div ref={scrollRef} className="overflow-x-auto pb-1.5 pt-1 -mx-1 px-1 min-w-0">
        <div className="flex items-end gap-1.5 h-12 min-w-full w-max">
          {versions.map((h, i) => {
            const isLatest = i === versions.length - 1;
            const isPinned = i === pinnedIdx;
            const barH = Math.max(16, Math.round((h.healthScore / 100) * 48));
            return (
              <button
                key={h._id || i}
                onClick={() => setPinnedIdx(i)}
                aria-label={`Version from ${new Date(h.createdAt).toLocaleDateString()}, score ${h.healthScore}`}
                aria-pressed={isPinned}
                className="flex flex-col items-center gap-1 flex-1 min-w-[20px] max-w-[36px] group shrink-0"
              >
                <span className={cn('text-[9px] font-bold', isPinned ? 'text-brand' : 'text-faint')}>{h.healthScore}</span>
                <div
                  className={cn(
                    'w-full rounded-t-md transition-all',
                    isPinned && 'ring-2 ring-brand ring-offset-1 ring-offset-surface'
                  )}
                  style={{
                    height: `${barH}px`,
                    backgroundColor: isLatest || isPinned ? 'var(--color-brand)' : 'var(--line-border)',
                    opacity: isPinned || isLatest ? 1 : 0.85,
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Pinned-version detail — click any bar above to inspect that version */}
      {selected && (
        <div className="mt-3 pt-3 border-t border-line flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink truncate">{selected.originalName || 'Resume version'}</p>
            <p className="text-[10px] text-faint mt-0.5">
              {new Date(selected.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} · Score {selected.healthScore}/100
            </p>
          </div>
          {delta !== null && (
            <span
              className={cn(
                'shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full',
                delta > 0 && 'bg-brand/10 text-brand',
                delta < 0 && 'bg-danger/10 text-danger',
                delta === 0 && 'bg-surface-2 text-faint'
              )}
            >
              {delta > 0 ? <Icon.ArrowUp size={11} /> : delta < 0 ? <Icon.ArrowDown size={11} /> : null}
              {delta === 0 ? 'No change' : `${delta > 0 ? '+' : ''}${delta} vs previous`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function RecruiterFeedbackTab({ resume, onOpenFix }) {

  if (!resume) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon.FileText size={40} className="text-line mb-4" />
      <p className="text-sm font-medium text-faint">Upload a resume to see recruiter feedback</p>
    </div>
  );

  const redFlags = resume.redFlags || [];
  const suggestions = resume.suggestions || [];
  const breakdown = resume.healthBreakdown || [];

  return (
    <div className="space-y-8">
      {/* Context callout — sets the "6 second scan" framing immediately */}
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface border border-line text-muted">
          <Icon.Clock size={15} />
        </span>
        <p className="text-xs text-muted leading-relaxed">
          <span className="font-semibold text-ink">Average recruiter spends 6 seconds</span> on a first scan. This is not about career gaps — it's about whether they'd keep reading past that first glance. We simulate what a recruiter sees at a glance: formatting, structure, and immediate red flags.
        </p>
      </div>

      {/* Red Flags */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-ink flex items-center gap-2">
            {redFlags.length > 0
              ? <><Icon.AlertTriangle size={16} className="text-danger" /> Recruiter Red Flags ({redFlags.length})</>
              : <><Icon.Shield size={16} className="text-brand" /> All Checks Passed</>}
          </h3>
        </div>
        {redFlags.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {redFlags.map((flag) => (
              <StickyNote key={flag.key} flag={flag} onOpenFix={onOpenFix} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-brand/30 bg-brand/10 px-4 py-4 flex items-center gap-3">
            <Icon.Check size={20} className="text-brand shrink-0" />
            <p className="text-sm text-brand">Your resume passed all formatting and content checks.</p>
          </div>
        )}
      </div>

      {/* Health Breakdown */}
      {breakdown.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-ink mb-4">Health Breakdown</h3>
          <div className="space-y-3">
            {breakdown.map((item) => {
              const pct = item.max ? Math.round((item.score / item.max) * 100) : 0;
              const color = item.status === 'good' ? 'var(--color-brand)' : item.status === 'warn' ? 'var(--color-warning)' : 'var(--color-danger)';
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-ink">{item.label}</span>
                    <span style={{ color }}>{item.score}/{item.max}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  {item.tip && <p className="text-[11px] text-faint mt-1">{item.tip}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-ink mb-3">Improvement Suggestions</h3>
          <ul className="space-y-2">
            {suggestions.map((s, i) => (
              <li key={i} className="flex justify-between items-center rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-muted">
                <div className="flex items-start gap-2.5">
                  <Icon.ChevronRight size={16} className="mt-0.5 shrink-0 text-muted" />
                  <span>{s}</span>
                </div>
                <button
                  onClick={() => onOpenFix({
                    title: `Suggestion #${i + 1}`,
                    current: s,
                    fix: s,
                    type: 'suggestion'
                  })}
                  className="ml-4 shrink-0 text-xs font-bold text-brand hover:underline"
                >
                  Fix
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StickyNote({ flag, onOpenFix }) {
  const isCritical = flag.severity === 'critical';
  return (
    <div className={cn(
      'rounded-xl border p-4 text-sm flex flex-col justify-between',
      isCritical
        ? 'border-danger/30 bg-danger/10'
        : 'border-warning/30 bg-warning/10'
    )}>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className={cn(
            'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded',
            isCritical ? 'bg-danger text-white' : 'bg-warning text-white'
          )}>
            {flag.severity}
          </span>
          <p className="font-semibold text-ink">{flag.label}</p>
        </div>
        <p className="text-xs text-muted leading-relaxed">{flag.description}</p>
      </div>
      <div className="mt-3 pt-3 border-t border-line flex items-center justify-between text-xs text-muted">
        <div className="flex items-start gap-1">
          <span className="font-bold text-[11px] shrink-0 text-ink">💡 Fix:</span>
          <span className="truncate max-w-[150px]">{flag.fix}</span>
        </div>
        <button
          onClick={() => onOpenFix({
            title: flag.label,
            current: flag.description,
            fix: flag.fix,
            type: 'flag'
          })}
          className="text-xs font-bold text-brand hover:underline shrink-0 ml-2"
        >
          Fix Red Flag
        </button>
      </div>
    </div>
  );
}


/* ── Tab B: Market Alignment ── */
function MarketAlignmentTab({ gapData, loading, role, onRefresh }) {
  const [trendingIdx, setTrendingIdx] = useState(0);
  const tickerRef = useRef(null);

  const missingSkills = gapData?.missingSkills || [];
  const matchedSkills = gapData?.matchedSkills || [];
  const trendingSkills = missingSkills.filter((s) => (s.demand ?? s.marketFrequency ?? 0) > 60);

  useEffect(() => {
    if (trendingSkills.length === 0) return;
    const interval = setInterval(() => {
      setTrendingIdx((i) => (i + 1) % trendingSkills.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [trendingSkills.length]);

  return (
    <div className="space-y-6">
      {/* Role display + refresh */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 h-10 px-3 rounded-xl border border-line bg-surface-2">
          <Icon.Target size={14} className="text-faint shrink-0" />
          <span className="text-sm font-medium text-ink truncate">{role}</span>
        </div>
        <button
          onClick={onRefresh}
          className="h-10 px-4 rounded-xl border border-line text-sm font-medium text-muted hover:bg-surface-2 flex items-center gap-2 transition-colors"
        >
          <Icon.ArrowRight size={14} /> Analyze
        </button>
      </div>

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-11 w-full rounded-xl" />
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <Skeleton className="h-3 w-32 mb-3" />
              <SkeletonChips count={5} widths={[80, 100, 65, 90, 75]} />
            </div>
            <div>
              <Skeleton className="h-3 w-32 mb-3" />
              <SkeletonChips count={6} widths={[95, 70, 110, 85, 65, 100]} />
            </div>
          </div>
          <p className="text-center text-xs text-faint">Analyzing skill gap against live market data…</p>
        </div>
      ) : gapData ? (
        <>
          {/* Market Velocity Ticker */}
          {trendingSkills.length > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-line bg-canvas px-4 py-3">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-danger shrink-0">
                <Icon.Zap size={12} /> Trending
              </span>
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-semibold text-ink animate-fade-up" key={trendingIdx}>
                  <span className="text-danger font-bold">{trendingSkills[trendingIdx]?.skill}</span>
                  {' '}appears in {trendingSkills[trendingIdx]?.demand ?? trendingSkills[trendingIdx]?.marketFrequency}% of job postings for {role}
                </p>
              </div>
            </div>
          )}

          {/* Skills grid */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand mb-3 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brand" />
                Matched Skills ({matchedSkills.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {matchedSkills.map((s) => {
                  const skillName = s.skill || s;
                  return (
                    <motion.span
                      layout
                      key={skillName}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.25 }}
                      className="inline-flex items-center gap-2 rounded-xl border border-brand/30 bg-brand/10 px-3.5 py-1.5 text-xs font-semibold text-brand shadow-sm"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                      {skillName}
                    </motion.span>
                  );
                })}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-danger mb-3 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-danger" />
                Missing Skills ({missingSkills.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {missingSkills.slice(0, 12).map((s) => (
                  <motion.span
                    layout
                    key={s.skill}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className="inline-flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-1.5 text-xs font-semibold text-danger shadow-sm"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                    <span>{s.skill}</span>
                    {(s.demand ?? s.marketFrequency) ? (
                      <span className="text-[10px] opacity-75 font-normal">({s.demand ?? s.marketFrequency}%)</span>
                    ) : null}
                  </motion.span>
                ))}
              </div>
            </div>
          </div>

        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Icon.Target size={36} className="text-line mb-3" />
          <p className="text-sm text-faint">Select a role and click Analyze to see market alignment.</p>
        </div>
      )}
    </div>
  );
}

function FixHelperDrawer({ target: fixTarget, onClose }) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);
  const toast = useToast();
  const panelRef = useRef(null);

  // Reset copy state & trigger entrance animation when target changes
  useEffect(() => {
    setCopied(false);
    if (fixTarget) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [fixTarget]);

  // Escape key dismissal
  useEffect(() => {
    if (!fixTarget) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fixTarget, onClose]);

  // Lock body scroll while panel is open
  useEffect(() => {
    if (fixTarget) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [fixTarget]);

  if (!fixTarget) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(fixTarget.fix);
    setCopied(true);
    toast.success('Fix copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const fixType = fixTarget.type; // 'flag' | 'suggestion' | 'recommendation'
  const typeConfig = {
    flag: {
      label: 'Recruiter Red Flag',
      reason: 'This pattern triggers automated rejection in most ATS systems. Recruiters reviewing your resume will flag this as incomplete or unprofessional.',
      borderColor: 'border-danger/30',
      bgColor: 'bg-danger/10',
      textColor: 'text-danger',
    },
    suggestion: {
      label: 'Resume Improvement',
      reason: 'Addressing this will strengthen your resume\'s clarity and make your experience more compelling to hiring managers.',
      borderColor: 'border-line',
      bgColor: 'bg-ink/5',
      textColor: 'text-ink',
    },
    recommendation: {
      label: 'AI Recommendation',
      reason: 'This recommendation is based on analyzing your resume against current role requirements. Acting on it will directly improve your role-fit score.',
      borderColor: 'border-warning/30',
      bgColor: 'bg-warning/10',
      textColor: 'text-warning',
    },
  };
  const config = typeConfig[fixType] || typeConfig.suggestion;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[6px] fix-panel-backdrop"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={panelRef}
        className="relative w-full max-w-[440px] h-full bg-surface border-l border-line flex flex-col fix-panel-drawer"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-line bg-canvas">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink text-white shadow-sm">
              <Icon.Sparkles size={16} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-ink leading-tight">Fix Helper</h3>
              <p className="text-[10px] text-faint mt-0.5">{config.label}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-2 text-faint hover:text-muted transition-all duration-200"
            aria-label="Close panel"
          >
            <Icon.X size={18} />
          </button>
        </div>

        {/* ── Scrollable Content ── */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="fix-panel-content space-y-5">

            {/* Section 1: What was flagged */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-surface-2 text-[10px] font-bold text-muted">1</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-faint">{fixType === 'flag' ? 'What was flagged' : 'What to improve'}</span>
              </div>
              <div className="rounded-xl border border-line bg-surface p-4">
                <h4 className="text-[13px] font-bold text-ink leading-snug">{fixTarget.title}</h4>
                <p className="text-xs text-muted mt-2 leading-relaxed">{fixTarget.current}</p>
              </div>
            </div>

            {/* Section 2: Why it matters */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-surface-2 text-[10px] font-bold text-muted">2</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-faint">Why it matters</span>
              </div>
              <div className={cn(
                'rounded-xl border p-4 space-y-2',
                config.borderColor, config.bgColor
              )}>
                <div className="flex items-center gap-2">
                  {fixType === 'flag' ? <Icon.AlertTriangle size={14} className={config.textColor} /> : <Icon.Info size={14} className={config.textColor} />}
                  <span className={cn(
                    'text-[10px] font-bold uppercase tracking-wider',
                    config.textColor
                  )}>
                    {config.label}
                  </span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  {config.reason}
                </p>
              </div>
            </div>


            {/* Section 3: Recommended fix */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-surface-2 text-[10px] font-bold text-muted">3</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-faint">Recommended fix</span>
              </div>
              <div className="rounded-xl border border-line bg-surface-2 p-4 fix-panel-shimmer relative overflow-hidden">
                <div className="flex items-center gap-1.5 mb-3">
                  <Icon.Sparkles size={12} className="text-ink" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink">AI Suggestion</span>
                </div>
                <p className="text-[13px] text-ink leading-relaxed font-medium break-words whitespace-pre-wrap select-all">
                  {fixTarget.fix}
                </p>
              </div>
            </div>

            {/* Quick tip */}
            <div className="flex items-start gap-2.5 rounded-lg border border-line bg-canvas px-4 py-3">
              <Icon.Info size={14} className="text-faint shrink-0 mt-0.5" />
              <p className="text-[11px] text-faint leading-relaxed">
                Copy this fix, paste it into your resume, then re-upload to see your updated score.
              </p>
            </div>

          </div>
        </div>

        {/* ── Footer Actions ── */}
        <div className="px-6 py-4 border-t border-line bg-canvas flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-line text-sm font-medium text-muted hover:bg-line-soft hover:border-faint transition-all duration-200"
          >
            Dismiss
          </button>
          <button
            onClick={handleCopy}
            className={cn(
              'flex-1 h-11 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm',
              copied
                ? 'bg-brand text-white fix-panel-copy-success'
                : 'bg-brand text-white hover:bg-brand-soft hover:shadow-md active:scale-[0.98]'
            )}
          >
            {copied ? <Icon.Check size={16} /> : <Icon.Copy size={16} />}
            {copied ? 'Copied to clipboard!' : 'Copy AI Fix'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
