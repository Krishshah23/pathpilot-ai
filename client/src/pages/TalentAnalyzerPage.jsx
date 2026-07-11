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

const TABS = ['Recruiter Feedback', 'Market Alignment', 'Live Jobs'];

export default function TalentAnalyzerPage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [resume, setResume] = useState(null);
  const [loadingResume, setLoadingResume] = useState(true);
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Gap data
  const [gapData, setGapData] = useState(null);
  const [loadingGap, setLoadingGap] = useState(false);
  const [role, setRole] = useState(user?.profile?.dreamRole || (DREAM_ROLES?.[0] ?? 'Full Stack Developer'));

  // Live jobs
  const [liveJobs, setLiveJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/resume');
        setResume(data.data.resume);
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
      const { data } = await api.get(`/gap?role=${encodeURIComponent(role)}`);
      setGapData(data.data);
    } catch { /* silent */ }
    finally { setLoadingGap(false); }
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
            <div className="flex h-64 items-center justify-center rounded-2xl border border-[#EAEAE5] bg-white">
              <Spinner className="h-6 w-6 text-[#2B4C3F]" />
            </div>
          ) : !resume || file ? (
            <UploadZone
              file={file}
              setFile={setFile}
              analyzing={analyzing}
              onAnalyze={analyze}
              onCancel={resume ? () => setFile(null) : null}
            />
          ) : (
            <DocumentPanel resume={resume} onReplace={() => setFile(null)} />
          )}
        </div>

        {/* ── Right: Tabbed Workspace ──────────────────────────────── */}
        <div className="bg-white border border-[#EAEAE5] rounded-2xl overflow-hidden">
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
            {activeTab === 0 && <RecruiterFeedbackTab resume={resume} />}
            {activeTab === 1 && (
              <MarketAlignmentTab
                gapData={gapData}
                loading={loadingGap}
                role={role}
                setRole={setRole}
                onRefresh={loadGap}
              />
            )}
            {activeTab === 2 && (
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
    </AppShell>
  );
}

/* ── Upload Zone ── */
function UploadZone({ file, setFile, analyzing, onAnalyze, onCancel }) {
  return (
    <div className="rounded-2xl border border-[#EAEAE5] bg-white p-8">
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
    <div className="rounded-2xl border border-[#EAEAE5] bg-white overflow-hidden">
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
          <span className="font-serif text-2xl font-black text-[#2B4C3F]">{resume.healthScore}<span className="text-sm text-[#A3A3A3] font-normal">/100</span></span>
        </div>
        <div className="h-2 rounded-full bg-[#EAEAE5] overflow-hidden">
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
        {items.length > 12 && (
          <span className="text-xs text-[#A3A3A3] py-1">+{items.length - 12} more</span>
        )}
      </div>
    </div>
  );
}

/* ── Tab A: Recruiter Feedback ── */
function RecruiterFeedbackTab({ resume }) {
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
              : <><Icon.Shield size={16} className="text-[#2B4C3F]" /> All Checks Passed</>
            }
          </h3>
        </div>
        {redFlags.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {redFlags.map((flag) => (
              <StickyNote key={flag.key} flag={flag} />
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
              <li key={i} className="flex gap-2.5 text-sm text-[#525252]">
                <Icon.ChevronRight size={16} className="mt-0.5 shrink-0 text-[#2B4C3F]" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StickyNote({ flag }) {
  const isCritical = flag.severity === 'critical';
  return (
    <div className={cn(
      'rounded-xl border p-4 text-sm',
      isCritical
        ? 'border-[#E8C4B8] bg-[#FDF5F3]'
        : 'border-[#E8D8A8] bg-[#FEFBF0]'
    )}>
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
      <div className="mt-3 pt-3 border-t border-current/10 flex items-start gap-1.5 text-xs text-[#525252]">
        <span className="font-bold text-[11px] shrink-0">💡 Fix:</span>
        <span>{flag.fix}</span>
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
