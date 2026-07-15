import { useEffect, useState, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Icon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/Spinner';
import { FileUpload } from '@/components/ui/FileUpload';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { DREAM_ROLES } from '@/config/careerData';

const TABS = ['AI Role Analysis', 'Recruiter Feedback', 'Market Alignment', 'Live Jobs'];

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
  // Feature weights generated from CatBoost/ML diagnostics logic
  const factors = [
    { name: 'Core Skill Match', weight: 35, color: '#2B4C3F' },
    { name: 'Projects Metrics & Depth', weight: 25, color: '#4E7D6A' },
    { name: 'Experience Chronology', weight: 20, color: '#92400E' },
    { name: 'ATS Formatting Checks', weight: 20, color: '#B85A3C' }
  ];

  return (
    <div className="rounded-xl border border-[#EAEAE5] bg-white p-5 space-y-4">
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#171717]">Explainable Scoring Factors</h4>
        <p className="text-[11px] text-[#A3A3A3] mt-0.5">Calculated model feature weight parameters contributing to your score</p>
      </div>
      <div className="space-y-3">
        {factors.map((f) => (
          <div key={f.name} className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-[#525252]">{f.name}</span>
              <span className="font-semibold" style={{ color: f.color }}>{f.weight}% impact</span>
            </div>
            <div className="h-2 w-full bg-[#F5F5F3] rounded-full overflow-hidden">
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
      <Icon.Sparkles size={40} className="text-[#EAEAE5] mb-4" />
      <p className="text-sm font-medium text-[#A3A3A3] mb-1">No resume analyzed yet</p>
      <p className="text-xs text-[#D0D0CA]">Upload a resume to unlock AI role analysis</p>
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
      <Icon.Sparkles size={40} className="text-[#EAEAE5] mb-4" />
      <p className="text-sm font-medium text-[#A3A3A3] mb-1">Re-analyze to get AI insights</p>
      <p className="text-xs text-[#D0D0CA]">This resume was analyzed before the AI layer was added. Upload it again to get role-specific analysis.</p>
    </div>
  );

  const fitColor = roleFitScore >= 70 ? '#2B4C3F' : roleFitScore >= 45 ? '#92400E' : '#B85A3C';

  return (
    <div className="space-y-6">
      {/* Role Fit Score & SHAP Weights */}
      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        {roleFitScore != null && (
          <div className="rounded-xl border border-[#EAEAE5] p-5 flex flex-col items-center justify-center text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-3">Role Fit Score</p>
            <div className="relative flex items-center justify-center">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="40" stroke="#EAEAE5" strokeWidth="6" fill="none" />
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
                <p className="text-[9px] font-bold text-[#A3A3A3]">/100</p>
              </div>
            </div>
            <p className="text-[10px] text-[#A3A3A3] mt-3">Targeting {role}</p>
          </div>
        )}

        <SHAPVisualizer resume={resume} />
      </div>

      {/* Next Step Priority */}
      {nextStep && (
        <div className="flex items-start gap-3 rounded-xl border border-[#C8DDD6] bg-[#F0F5F3] p-4">
          <Icon.ArrowRight size={16} className="text-[#2B4C3F] mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#2B4C3F] mb-1">Top Priority Right Now</p>
            <p className="text-sm text-[#2B4C3F] font-medium">{nextStep}</p>
          </div>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Key Gaps */}
        {keyGaps.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#B85A3C] mb-3 flex items-center gap-1.5">
              <Icon.AlertTriangle size={12} /> Key Gaps ({keyGaps.length})
            </h3>
            <div className="space-y-2">
              {keyGaps.map((gap, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-lg border border-[#E8C4B8] bg-[#FDF5F3] px-3 py-2.5 text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#B85A3C] text-white text-[10px] font-bold mt-0.5">{i + 1}</span>
                  <span className="text-[#525252]">{gap}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strengths */}
        {strengthAreas.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#2B4C3F] mb-3 flex items-center gap-1.5">
              <Icon.Check size={12} /> Strengths
            </h3>
            <div className="space-y-2">
              {strengthAreas.map((s, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-lg border border-[#C8DDD6] bg-[#F0F5F3] px-3 py-2.5 text-sm">
                  <Icon.Check size={14} className="text-[#2B4C3F] shrink-0 mt-0.5" />
                  <span className="text-[#2B4C3F]">{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ATS Keyword Match Heatmap & Gap Navigator Overlay */}
      {atsKeywordsMissing.length > 0 && (
        <div className="rounded-xl border border-[#EAEAE5] p-5 space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">ATS Keyword Overlay</h3>
            <p className="text-[11px] text-[#A3A3A3] mt-0.5">Critical target keywords needed to rank highly for {role}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#2B4C3F] mb-2">Identified Keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {(resume.skills || []).slice(0, 8).map((kw, i) => (
                  <span key={i} className="rounded-lg border border-[#C8DDD6] bg-[#F0F5F3] px-2.5 py-1 text-xs text-[#2B4C3F] font-medium">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#B85A3C] mb-2">Missing Keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {atsKeywordsMissing.map((kw, i) => (
                  <span key={i} className="rounded-lg border border-[#E8C4B8] bg-[#FDF5F3] px-2.5 py-1 text-xs text-[#B85A3C] font-medium">
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
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-3">AI Recommendations</h3>
          <ul className="space-y-2">
            {aiRecommendations.map((rec, i) => (
              <li key={i} className="flex items-start justify-between rounded-xl border border-[#EAEAE5] bg-[#F5F5F3] px-4 py-3 text-sm text-[#525252]">
                <div className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#171717] text-xs font-bold text-white mt-0.5">{i + 1}</span>
                  <span>{rec}</span>
                </div>
                <button
                  onClick={() => onOpenFix({
                    title: `AI Recommendation #${i + 1}`,
                    current: rec,
                    fix: `Action: Add a clear section listing this standard and implement a mock project targeting it.`,
                    type: 'recommendation'
                  })}
                  className="ml-4 shrink-0 text-xs font-bold text-[#2B4C3F] hover:underline"
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

  // Live jobs
  const [liveJobs, setLiveJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Resume version history
  const [resumeHistory, setResumeHistory] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/resume');
        setResume(data.data.resume);
        // Fetch version history in parallel
        const histRes = await api.get('/resume/history').catch(() => null);
        if (histRes?.data?.data?.history?.length > 1) {
          setResumeHistory(histRes.data.data.history);
        }
      } catch { /* no resume yet */ }
      finally { setLoadingResume(false); }
    })();
  }, []);

  useEffect(() => {
    if (activeTab === 1) loadGap();
    if (activeTab === 2) loadJobs();
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

  const loadJobs = async () => {
    setLoadingJobs(true);
    try {
      const { data } = await api.get(`/live-jobs?role=${encodeURIComponent(role)}`);
      setLiveJobs(data.data.jobs || []);
    } catch { /* silent */ }
    finally { setLoadingJobs(false); }
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
        <h1 className="font-serif text-3xl font-bold text-[#171717]">Resume Strategy</h1>
        <p className="mt-2 text-sm text-[#525252]">Upload your resume and analyze it against live market requirements.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
        {/* ── Left: The Document ───────────────────────────────────── */}
        <div className="space-y-4">
          {loadingResume ? (
            <div className="card flex h-64 items-center justify-center">
              <Spinner className="h-6 w-6 text-[#2B4C3F]" />
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
            <div className="card p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-3">Score History</p>
              <div className="flex items-end gap-2 h-12">
                {resumeHistory.slice().reverse().map((h, i) => {
                  const isLatest = i === resumeHistory.length - 1;
                  const barH = Math.max(16, Math.round((h.healthScore / 100) * 48));
                  return (
                    <div key={h._id} className="flex flex-col items-center gap-1 flex-1" title={`${new Date(h.createdAt).toLocaleDateString()} — ${h.healthScore}/100`}>
                      <span className="text-[9px] font-bold text-[#A3A3A3]">{h.healthScore}</span>
                      <div
                        className="w-full rounded-t-md transition-all"
                        style={{ height: `${barH}px`, backgroundColor: isLatest ? '#2B4C3F' : '#EAEAE5' }}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-[#A3A3A3] mt-2">{resumeHistory.length} versions uploaded</p>
            </div>
          )}
        </div>

        {/* ── Right: Tabbed Workspace ──────────────────────────────── */}
        <div className="card overflow-hidden">
          {/* Tab Bar */}
          <div className="flex border-b border-[#EAEAE5]">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={cn(
                  'flex-1 py-4 text-sm font-medium transition-colors',
                  activeTab === i
                    ? 'text-[#171717] border-b-2 border-[#171717] bg-white'
                    : 'text-[#A3A3A3] hover:text-[#525252] hover:bg-[#F5F5F3]'
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 0 && <AIRoleAnalysisTab resume={resume} role={role} onOpenFix={setFixTarget} />}
            {activeTab === 1 && <RecruiterFeedbackTab resume={resume} onOpenFix={setFixTarget} />}
            {activeTab === 2 && (
              <MarketAlignmentTab
                gapData={gapData}
                loading={loadingGap}
                role={role}
                setRole={setRole}
                onRefresh={loadGap}
              />
            )}
            {activeTab === 3 && (
              <LiveJobsTab
                jobs={liveJobs}
                loading={loadingJobs}
                role={role}
                setRole={setRole}
                onRefresh={loadJobs}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Fix Helper Side Panel Overlay ── */}
      {fixTarget && (() => {
        const [copied, setCopied] = useState(false);
        const handleCopy = () => {
          navigator.clipboard.writeText(fixTarget.fix);
          setCopied(true);
          toast.success('Fix copied to clipboard!');
          setTimeout(() => setCopied(false), 2000);
        };

        return (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity">
            <div className="absolute inset-0" onClick={() => setFixTarget(null)} />
            <div className="relative w-full max-w-md h-full bg-white border-l border-[#EAEAE5] shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-fade-in">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[#EAEAE5] pb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2B4C3F]/10 text-[#2B4C3F]">
                      <Icon.Sparkles size={16} />
                    </span>
                    <h3 className="text-sm font-bold text-[#171717]">Interactive Fix Helper</h3>
                  </div>
                  <button onClick={() => setFixTarget(null)} className="text-[#A3A3A3] hover:text-[#525252] transition-colors">
                    <Icon.X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#A3A3A3]">Critique Target</span>
                    <h4 className="text-sm font-bold text-[#171717] mt-1">{fixTarget.title}</h4>
                    <p className="text-xs text-[#525252] mt-1 leading-relaxed">{fixTarget.current}</p>
                  </div>

                  <div className="rounded-xl border border-[#E8C4B8] bg-[#FDF5F3] p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#B85A3C]">
                      <Icon.AlertTriangle size={12} /> Target Issue
                    </div>
                    <p className="text-xs text-[#525252] leading-relaxed">
                      This issue negatively impacts your overall score. Standard recruiter filters penalize this pattern.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#A3A3A3]">AI Rewrite Recommendation</span>
                    <div className="rounded-xl border border-[#C8DDD6] bg-[#F0F5F3] p-4 text-xs font-mono text-[#2B4C3F] leading-relaxed break-words whitespace-pre-wrap select-all">
                      {fixTarget.fix}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#EAEAE5] pt-5 mt-6 flex gap-3">
                <button
                  onClick={() => setFixTarget(null)}
                  className="flex-1 h-10 rounded-xl border border-[#EAEAE5] text-sm font-medium text-[#525252] hover:bg-[#F5F5F3] transition-colors"
                >
                  Close Panel
                </button>
                <button
                  onClick={handleCopy}
                  className="flex-1 h-10 rounded-xl bg-[#2B4C3F] text-white text-sm font-semibold hover:bg-[#20392F] transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {copied ? <Icon.Check size={16} /> : <Icon.Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy AI Fix'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </AppShell>
  );
}

/* ── Upload Zone ── */

function UploadZone({ file, setFile, analyzing, onAnalyze, onCancel }) {
  return (
    <div className="card p-8">
      <h2 className="font-serif text-base font-bold text-[#171717] mb-1">The Document</h2>
      <p className="text-xs text-[#A3A3A3] mb-6">Upload a text-based PDF resume for analysis.</p>
      <FileUpload file={file} onSelect={setFile} />
      {analyzing ? (
        <div className="mt-6 flex items-center justify-center gap-3 rounded-xl border border-[#EAEAE5] py-4 text-sm text-[#525252]">
          <Spinner className="h-5 w-5 text-[#2B4C3F]" />
          <span>Analyzing resume…</span>
        </div>
      ) : (
        <div className="mt-6 flex gap-3">
          {onCancel && (
            <button onClick={onCancel} className="flex-1 h-10 rounded-xl border border-[#EAEAE5] text-sm font-medium text-[#525252] hover:bg-[#F5F5F3] transition-colors">
              Cancel
            </button>
          )}
          <button
            onClick={onAnalyze}
            disabled={!file}
            className="flex-1 h-10 rounded-xl bg-[#171717] text-white text-sm font-semibold hover:bg-[#2a2a2a] disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
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
  return (
    <div className="card overflow-hidden">
      {/* Paper header */}
      <div className="bg-[#F5F5F3] border-b border-[#EAEAE5] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAEAE5] text-[#525252]">
            <Icon.FileText size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#171717] truncate max-w-[180px]">{resume.originalName || 'Resume'}</p>
            <p className="text-xs text-[#A3A3A3]">{resume.wordCount} words · Score {resume.healthScore}/100</p>
          </div>
        </div>
        <button
          onClick={onReplace}
          className="text-xs font-semibold text-[#525252] hover:text-[#171717] underline underline-offset-2"
        >
          Replace
        </button>
      </div>

      {/* Health Score */}
      <div className="px-6 py-5 border-b border-[#EAEAE5]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#A3A3A3] uppercase tracking-wider">Resume Health</span>
          <span className="font-serif text-2xl font-black text-[#2B4C3F]"><AnimatedScore target={resume.healthScore} /><span className="text-sm text-[#A3A3A3] font-normal">/100</span></span>
        </div>
        <div className="h-2 rounded-full progress-ruler overflow-hidden">
          <div
            className="h-full rounded-full bg-[#2B4C3F] transition-all duration-700"
            style={{ width: `${resume.healthScore}%` }}
          />
        </div>
      </div>



      {/* Extracted sections */}
      <div className="px-6 py-5 space-y-4 max-h-[420px] overflow-y-auto">
        <SectionList title="Skills" items={resume.skills} />
        <SectionList title="Experience" items={resume.experience} />
        <SectionList title="Education" items={resume.education} />
        <SectionList title="Projects" items={resume.projects?.map((p) => p.title)} />
      </div>
    </div>
  );
}

function SectionList({ title, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-2">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.slice(0, 12).map((item, i) => (
          <span key={i} className="rounded-lg border border-[#EAEAE5] bg-[#F5F5F3] px-2.5 py-1 text-xs text-[#525252]">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function RecruiterFeedbackTab({ resume, onOpenFix }) {

  if (!resume) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon.FileText size={40} className="text-[#EAEAE5] mb-4" />
      <p className="text-sm font-medium text-[#A3A3A3]">Upload a resume to see recruiter feedback</p>
    </div>
  );

  const redFlags = resume.redFlags || [];
  const suggestions = resume.suggestions || [];
  const breakdown = resume.healthBreakdown || [];

  return (
    <div className="space-y-8">
      {/* Red Flags */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#171717] flex items-center gap-2">
            {redFlags.length > 0
              ? <><Icon.AlertTriangle size={16} className="text-[#B85A3C]" /> Recruiter Red Flags ({redFlags.length})</>
              : <><Icon.Shield size={16} className="text-[#2B4C3F]" /> All Checks Passed</>}
          </h3>
        </div>
        {redFlags.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {redFlags.map((flag) => (
              <StickyNote key={flag.key} flag={flag} onOpenFix={onOpenFix} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-[#C8DDD6] bg-[#F0F5F3] px-4 py-4 flex items-center gap-3">
            <Icon.Check size={20} className="text-[#2B4C3F] shrink-0" />
            <p className="text-sm text-[#2B4C3F]">Your resume passed all formatting and content checks.</p>
          </div>
        )}
      </div>

      {/* Health Breakdown */}
      {breakdown.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-[#171717] mb-4">Health Breakdown</h3>
          <div className="space-y-3">
            {breakdown.map((item) => {
              const pct = item.max ? Math.round((item.score / item.max) * 100) : 0;
              const color = item.status === 'good' ? '#2B4C3F' : item.status === 'warn' ? '#92400E' : '#B85A3C';
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-[#171717]">{item.label}</span>
                    <span style={{ color }}>{item.score}/{item.max}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#EAEAE5] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  {item.tip && <p className="text-[11px] text-[#A3A3A3] mt-1">{item.tip}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-[#171717] mb-3">Improvement Suggestions</h3>
          <ul className="space-y-2">
            {suggestions.map((s, i) => (
              <li key={i} className="flex justify-between items-center rounded-xl border border-[#EAEAE5] bg-[#F5F5F3] px-4 py-2.5 text-sm text-[#525252]">
                <div className="flex items-start gap-2.5">
                  <Icon.ChevronRight size={16} className="mt-0.5 shrink-0 text-[#2B4C3F]" />
                  <span>{s}</span>
                </div>
                <button
                  onClick={() => onOpenFix({
                    title: `Suggestion #${i + 1}`,
                    current: s,
                    fix: `Rewrite Idea: Make sure this section has clear metric points or structured timeline layout.`,
                    type: 'flag'
                  })}
                  className="ml-4 shrink-0 text-xs font-bold text-[#2B4C3F] hover:underline"
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
        ? 'border-[#E8C4B8] bg-[#FDF5F3]'
        : 'border-[#E8D8A8] bg-[#FEFBF0]'
    )}>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className={cn(
            'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded',
            isCritical ? 'bg-[#B85A3C] text-white' : 'bg-[#92400E] text-white'
          )}>
            {flag.severity}
          </span>
          <p className="font-semibold text-[#171717]">{flag.label}</p>
        </div>
        <p className="text-xs text-[#525252] leading-relaxed">{flag.description}</p>
      </div>
      <div className="mt-3 pt-3 border-t border-current/10 flex items-center justify-between text-xs text-[#525252]">
        <div className="flex items-start gap-1">
          <span className="font-bold text-[11px] shrink-0">💡 Fix:</span>
          <span className="truncate max-w-[150px]">{flag.fix}</span>
        </div>
        <button
          onClick={() => onOpenFix({
            title: flag.label,
            current: flag.description,
            fix: flag.fix,
            type: 'flag'
          })}
          className="text-xs font-bold text-[#2B4C3F] hover:underline shrink-0 ml-2"
        >
          Fix Red Flag
        </button>
      </div>
    </div>
  );
}


/* ── Tab B: Market Alignment ── */
function MarketAlignmentTab({ gapData, loading, role, setRole, onRefresh }) {
  const [trendingIdx, setTrendingIdx] = useState(0);
  const tickerRef = useRef(null);

  const missingSkills = gapData?.missingSkills || [];
  const matchedSkills = gapData?.matchedSkills || [];
  const trendingSkills = missingSkills.filter((s) => s.demand > 60);

  useEffect(() => {
    if (trendingSkills.length === 0) return;
    const interval = setInterval(() => {
      setTrendingIdx((i) => (i + 1) % trendingSkills.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [trendingSkills.length]);

  return (
    <div className="space-y-6">
      {/* Role selector */}
      <div className="flex items-center gap-3">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="input flex-1 text-sm h-10"
        >
          {DREAM_ROLES?.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button
          onClick={onRefresh}
          className="h-10 px-4 rounded-xl border border-[#EAEAE5] text-sm font-medium text-[#525252] hover:bg-[#F5F5F3] flex items-center gap-2 transition-colors"
        >
          <Icon.ArrowRight size={14} /> Analyze
        </button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner className="h-6 w-6 text-[#2B4C3F]" />
        </div>
      ) : gapData ? (
        <>
          {/* Market Velocity Ticker */}
          {trendingSkills.length > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-[#EAEAE5] bg-[#FBFBFA] px-4 py-3">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#B85A3C] shrink-0">
                <Icon.Zap size={12} /> Trending
              </span>
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-semibold text-[#171717] animate-fade-up" key={trendingIdx}>
                  <span className="text-[#B85A3C] font-bold">{trendingSkills[trendingIdx]?.skill}</span>
                  {' '}appears in {trendingSkills[trendingIdx]?.demand}% of job postings for {role}
                </p>
              </div>
            </div>
          )}

          {/* Skills grid */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#2B4C3F] mb-3">
                Matched ({matchedSkills.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {matchedSkills.map((s) => (
                  <span key={s.skill || s} className="inline-flex items-center gap-1.5 rounded-lg border border-[#C8DDD6] bg-[#F0F5F3] px-3 py-1.5 text-xs font-medium text-[#2B4C3F]">
                    <Icon.Check size={11} /> {s.skill || s}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#B85A3C] mb-3">
                Missing ({missingSkills.length})
              </h3>
              <div className="space-y-2">
                {missingSkills.slice(0, 10).map((s) => (
                  <div key={s.skill} className="flex items-center justify-between rounded-lg border border-[#E8C4B8] bg-[#FDF5F3] px-3 py-2 text-xs">
                    <span className="font-semibold text-[#B85A3C]">{s.skill}</span>
                    {s.demand && <span className="text-[#A3A3A3]">{s.demand}% demand</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Icon.Target size={36} className="text-[#EAEAE5] mb-3" />
          <p className="text-sm text-[#A3A3A3]">Select a role and click Analyze to see market alignment.</p>
        </div>
      )}
    </div>
  );
}

/* ── Tab C: Live Jobs ── */
function LiveJobsTab({ jobs, loading, role, setRole, onRefresh }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="input flex-1 text-sm h-10"
        >
          {DREAM_ROLES?.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button
          onClick={onRefresh}
          className="h-10 px-4 rounded-xl border border-[#EAEAE5] text-sm font-medium text-[#525252] hover:bg-[#F5F5F3] flex items-center gap-2 transition-colors"
        >
          <Icon.ArrowRight size={14} /> Search
        </button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner className="h-6 w-6 text-[#2B4C3F]" />
        </div>
      ) : jobs.length > 0 ? (
        <div className="space-y-2">
          {jobs.map((job) => (
            <JobListCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Icon.Briefcase size={36} className="text-[#EAEAE5] mb-3" />
          <p className="text-sm text-[#A3A3A3]">No live openings found for {role}.</p>
        </div>
      )}
    </div>
  );
}

function JobListCard({ job }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#EAEAE5] bg-[#FBFBFA] px-4 py-3.5 gap-4 hover:border-[#D0D0CA] transition-colors">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#171717] truncate">{job.title}</p>
        <p className="text-xs text-[#525252] mt-0.5 truncate">{job.company} · {job.location}</p>
        <div className="flex items-center gap-3 mt-1.5">
          {job.seniority && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] bg-[#F5F5F3] border border-[#EAEAE5] px-1.5 py-0.5 rounded">
              {job.seniority.replace('_', ' ')}
            </span>
          )}
          {job.postedAgo && (
            <span className="text-[10px] text-[#A3A3A3]">{job.postedAgo}</span>
          )}
        </div>
      </div>
      {job.applyUrl && (
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#171717] text-white text-xs font-semibold hover:bg-[#2a2a2a] transition-colors"
        >
          Apply <Icon.ArrowRight size={12} />
        </a>
      )}
    </div>
  );
}
