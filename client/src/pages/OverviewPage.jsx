import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Icon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/Spinner';
import { ScoreGauge } from '@/components/charts/ScoreGauge';
import { useAuth } from '@/context/AuthContext';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

export default function OverviewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pathScore, setPathScore] = useState(null);
  const [marketSalary, setMarketSalary] = useState(null);
  const [blendedBenchmark, setBlendedBenchmark] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [growthPlan, setGrowthPlan] = useState(null);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const [editingRole, setEditingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState(user?.profile?.dreamRole || 'your target role');

  const fetchAiExplanation = () => {
    if (!user?.profile?.resumeUrl) return;
    setLoadingAi(true);
    api.post('/ai-coach/explain')
      .then((res) => {
        setAiExplanation(res.data.data.explanation);
      })
      .catch(() => {})
      .finally(() => setLoadingAi(false));
  };

  useEffect(() => {
    (async () => {
      try {
        const [scoreRes, growthRes] = await Promise.all([
          api.get('/path-score'),
          api.get('/growth').catch(() => ({ data: { data: { plan: null } } })) // Handle 404s gracefully
        ]);
        
        setPathScore(scoreRes.data.data.pathScore || {});
        setMarketSalary(scoreRes.data.data.marketSalary || null);
        setBlendedBenchmark(scoreRes.data.data.blendedBenchmark || null);
        setGrowthPlan(growthRes.data?.data?.plan || null);
        
        // If they have a resume, fetch the true Gemini explanation
        if (user?.profile?.resumeUrl) {
          fetchAiExplanation();
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [user?.profile?.resumeUrl]);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const res = await api.get('/report/generate', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'career-audit.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      navigate('/report');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-96 items-center justify-center">
          <Spinner className="h-8 w-8 text-[#2B4C3F]" />
        </div>
      </AppShell>
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'there';
  const dreamRole = user?.profile?.dreamRole || 'your target role';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  
  const handleRoleUpdate = async (newRole) => {
    setSelectedRole(newRole);
    setEditingRole(false);
    try {
      await api.patch('/profile', { profile: { dreamRole: newRole } });
      // Soft re-fetch — no reload, no flash
      setLoading(true);
      setAiExplanation(null); // Will trigger fresh Gemini call for new role
      const [scoreRes, growthRes] = await Promise.all([
        api.get('/path-score'),
        api.get('/growth').catch(() => ({ data: { data: { plan: null } } }))
      ]);
      setPathScore(scoreRes.data.data.pathScore || {});
      setMarketSalary(scoreRes.data.data.marketSalary || null);
      setBlendedBenchmark(scoreRes.data.data.blendedBenchmark || null);
      setGrowthPlan(growthRes.data?.data?.plan || null);
      // Re-trigger AI explanation for the new role (only if they have a resume)
      if (user?.profile?.resumeUrl) {
        setLoadingAi(true);
        api.post('/ai-coach/explain').then((res) => {
          setAiExplanation(res.data.data.explanation);
        }).catch(() => {}).finally(() => setLoadingAi(false));
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const score = pathScore?.displayScore ?? Math.round(pathScore?.score || 0);
  const readiness = pathScore?.readiness;
  const predictions = pathScore?.predictions;
  const peerBenchmark = pathScore?.peerBenchmark;
  const factors = pathScore?.factors || [];
  const explanations = predictions?.explanations;
  // Only show AI diagnostics when the user has an analyzed resume.
  // Without one the ML models run on all-zero inputs and produce nonsense.
  const hasResume = !!(user?.profile?.resumeUrl);

  // Determine Smart CTA State
  let smartCta = {
    title: 'Upload your resume',
    desc: 'Unlock your AI career audit, gap analysis, and path score.',
    btn: 'Analyze Resume',
    link: '/talent-analyzer',
    icon: <Icon.FileText size={20} />
  };
  
  if (hasResume) {
    if (!growthPlan) {
      smartCta = {
        title: 'Generate your skill roadmap',
        desc: 'Build a personalized weekly plan targeting your exact resume gaps.',
        btn: 'Build Roadmap',
        link: '/execution-engine',
        icon: <Icon.Map size={20} />
      };
    } else {
      smartCta = {
        title: 'Practice your weak points',
        desc: 'Start an AI mock interview focused on the gaps we identified.',
        btn: 'Start Interview',
        link: '/interview-prep',
        icon: <Icon.Mic size={20} />
      };
    }
  }

  return (
    <AppShell>
      <div className="space-y-10">

        {/* ── Hero Bar ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 pb-8 border-b border-[#EAEAE5]">
          <div>
            <p className="text-sm font-medium text-[#A3A3A3] mb-2">{greeting}</p>
            <h1 className="font-serif text-4xl font-bold text-[#171717] leading-tight">
              {firstName}.
            </h1>
            <p className="mt-3 text-base text-[#525252] max-w-xl leading-relaxed">
              Here's your career readiness snapshot for{' '}
              {editingRole ? (
                <select 
                  autoFocus
                  value={selectedRole} 
                  onChange={(e) => handleRoleUpdate(e.target.value)}
                  onBlur={() => setEditingRole(false)}
                  className="bg-transparent font-semibold text-[#2B4C3F] border-b-2 border-[#2B4C3F] outline-none"
                >
                  {['Software Engineer', 'Full Stack Developer', 'Frontend Developer', 'Backend Developer', 'Data Scientist', 'Product Manager'].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              ) : (
                <span 
                  onClick={() => setEditingRole(true)} 
                  className="font-semibold text-[#2B4C3F] cursor-pointer hover:underline underline-offset-4 decoration-2 decoration-[#C8DDD6]"
                  title="Click to change target role"
                >
                  {dreamRole} <Icon.Edit size={14} className="inline-block mb-1 text-[#A3A3A3] hover:text-[#2B4C3F]" />
                </span>
              )}.
              {readiness?.summary && ` ${readiness.summary}`}
            </p>
          </div>

          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="shrink-0 inline-flex items-center gap-2 h-10 px-5 rounded-xl border border-[#EAEAE5] bg-white text-sm font-semibold text-[#171717] hover:bg-[#F5F5F3] disabled:opacity-50 transition-colors"
          >
            {exporting
              ? <><Spinner className="h-4 w-4" /> Generating…</>
              : <><Icon.Download size={16} /> Export Career Audit</>
            }
          </button>
        </div>

        {/* ── Smart Action Card ────────────────────────────────────── */}
        <div className="bg-[#2B4C3F] rounded-2xl p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl shadow-[#2B4C3F]/10">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#C8DDD6]">
              {smartCta.icon}
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#C8DDD6] mb-1">Next Best Action</p>
              <h2 className="font-serif text-lg font-bold text-white">{smartCta.title}</h2>
              <p className="text-sm text-white/80">{smartCta.desc}</p>
            </div>
          </div>
          <button
            onClick={() => navigate(smartCta.link)}
            className="shrink-0 h-10 px-6 rounded-xl bg-white text-sm font-bold text-[#171717] hover:bg-[#F5F5F3] transition-colors"
          >
            {smartCta.btn}
          </button>
        </div>

        {/* ── Path Score + Factor Bars ──────────────────────────────── */}
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Score Display */}
          <div className="bg-white border border-[#EAEAE5] rounded-2xl p-8 flex flex-col items-center text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[#A3A3A3] mb-4">Path Score</p>
            <div className="relative flex items-center justify-center">
              <svg className="w-40 h-40 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" stroke="#EAEAE5" strokeWidth="8" fill="none" />
                <circle
                  cx="60" cy="60" r="52"
                  stroke="#2B4C3F" strokeWidth="8" fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 52}
                  strokeDashoffset={2 * Math.PI * 52 * (1 - score / 100)}
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>
              <div className="absolute text-center">
                <span className="font-serif text-4xl font-black text-[#171717]">{score}</span>
                <p className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-wider">/100</p>
              </div>
            </div>
            <p className="mt-4 text-sm font-semibold text-[#2B4C3F]">
              {readiness?.level || readiness?.label || 'Pending'}
            </p>
            <button
              className="mt-4 text-xs font-semibold text-[#525252] hover:text-[#171717] underline underline-offset-2"
              onClick={() => window.dispatchEvent(new CustomEvent('open-ai-coach', { detail: { type: 'pathScore' } }))}
            >
              Ask AI why →
            </button>
          </div>

          {/* Factor Progress Bars */}
          <div className="bg-white border border-[#EAEAE5] rounded-2xl p-8">
            <h2 className="font-serif text-lg font-bold text-[#171717] mb-6">Score Breakdown</h2>
            <div className="space-y-5">
              {factors.length > 0 ? factors.map((f) => (
                <FactorBar key={f.key} factor={f} />
              )) : (
                <p className="text-sm text-[#A3A3A3]">Analyze a resume to see factor breakdown.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── AI Career Audit Narrative (Replaces SHAP) ── */}
        {hasResume ? (
          <div className="bg-[#171717] rounded-2xl p-8 text-white relative overflow-hidden">
            {/* Background flair */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#2B4C3F] opacity-30 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2a2a2a]">
                  <Icon.Sparkles size={18} className="text-[#C8DDD6]" />
                </span>
                <div>
                  <h2 className="font-serif text-lg font-bold">PathPilot AI Analysis</h2>
                  <p className="text-xs text-[#A3A3A3]">Personalized career audit for {dreamRole}</p>
                </div>
              </div>

              {loadingAi ? (
                <div className="flex items-center gap-3 py-6">
                  <Spinner className="h-5 w-5 text-[#C8DDD6]" />
                  <span className="text-sm text-[#A3A3A3]">AI is writing your career narrative...</span>
                </div>
              ) : aiExplanation ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  {/* Safely map paragraphs (Gemini returns a string) */}
                  <div className="space-y-4 text-[#D0D0CA] leading-relaxed text-sm">
                    {aiExplanation.split('\n').filter(p => p.trim()).map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-2">
                  <p className="text-sm text-[#A3A3A3] mb-4">Could not load AI explanation.</p>
                  <button
                    onClick={fetchAiExplanation}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#2a2a2a] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3a3a3a] transition-colors border border-[#333]"
                  >
                    <Icon.RotateCw size={13} /> Retry Audit
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* No resume yet — show prompt instead of garbage predictions */
          <div className="rounded-2xl border border-dashed border-[#EAEAE5] bg-[#F5F5F3] p-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-[#EAEAE5] mx-auto mb-4">
              <Icon.FileText size={24} className="text-[#A3A3A3]" />
            </div>
            <h3 className="font-serif text-base font-bold text-[#171717] mb-1">No resume analyzed yet</h3>
            <p className="text-sm text-[#A3A3A3] max-w-sm mx-auto mb-5">
              Upload and analyze your resume to unlock your AI-powered career audit and actionable feedback.
            </p>
            <a
              href="/talent-analyzer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#171717] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2a2a2a] transition-colors"
            >
              <Icon.Upload size={15} /> Analyze Resume
            </a>
          </div>
        )}

        {/* ── Live Market Alignment ────────────────────── */}
        <div className="grid gap-6">
          {blendedBenchmark?.available && (
            <div className="bg-white border border-[#EAEAE5] rounded-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-serif text-base font-bold text-[#171717]">Live Market Alignment</h2>
                  <p className="text-xs text-[#A3A3A3] mt-1">Skill coverage vs. current market requirements</p>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#2B4C3F] bg-[#F0F5F3] border border-[#C8DDD6] px-2 py-1 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2B4C3F] animate-pulse" />
                  Live
                </span>
              </div>
              <div className="flex items-center gap-6 mb-5">
                <div className="text-center">
                  <p className="font-serif text-3xl font-black text-[#2B4C3F]">{blendedBenchmark.matchRate}%</p>
                  <p className="text-xs text-[#A3A3A3]">Skill match</p>
                </div>
                <div className="h-12 w-px bg-[#EAEAE5]" />
                <div className="text-center">
                  <p className="font-serif text-3xl font-black text-[#171717]">{blendedBenchmark.sampleSize}</p>
                  <p className="text-xs text-[#A3A3A3]">Listings analyzed</p>
                </div>
              </div>
              <div className="space-y-2">
                {blendedBenchmark.skills?.slice(0, 4).map((item) => (
                  <div key={item.skill} className="flex items-center justify-between rounded-lg border border-[#EAEAE5] px-3 py-2 text-xs">
                    <div>
                      <p className="font-semibold text-[#171717]">{item.skill}</p>
                      <p className="text-[#A3A3A3]">Demand: {item.demand}%</p>
                    </div>
                    <span className={cn(
                      'rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                      item.matched ? 'bg-[#F0F5F3] text-[#2B4C3F]' : 'bg-[#FDF5F3] text-[#B85A3C]'
                    )}>
                      {item.matched ? 'Matched' : 'Missing'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Profile Completion + Skills ───────────────────────────── */}
        <div className="grid gap-6 md:grid-cols-2">
          {pathScore?.profileCompletion && (
            <div className="bg-white border border-[#EAEAE5] rounded-2xl p-8">
              <h2 className="font-serif text-base font-bold text-[#171717] mb-5">Profile Completion</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {pathScore.profileCompletion.checks?.map((check) => (
                  <div key={check.label} className="flex items-center gap-2.5 rounded-lg border border-[#EAEAE5] px-3 py-2.5">
                    <span className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                      check.complete ? 'bg-[#2B4C3F] text-white' : 'bg-[#F5F5F3] text-[#D0D0CA]'
                    )}>
                      <Icon.Check size={11} />
                    </span>
                    <span className={cn('text-sm', check.complete ? 'text-[#171717]' : 'text-[#A3A3A3]')}>
                      {check.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pathScore?.skills?.length > 0 && (
            <div className="bg-white border border-[#EAEAE5] rounded-2xl p-8">
              <h2 className="font-serif text-base font-bold text-[#171717] mb-5">Skills in Your Profile</h2>
              <div className="flex flex-wrap gap-2">
                {pathScore.skills.map((skill) => (
                  <span key={skill} className="rounded-lg border border-[#EAEAE5] bg-[#F5F5F3] px-3 py-1.5 text-xs font-medium text-[#525252]">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

/* ── Sub-components ── */

function FactorBar({ factor }) {
  const colors = { good: '#2B4C3F', warn: '#92400E', bad: '#B85A3C' };
  const bgColors = { good: '#F0F5F3', warn: '#FEF3C7', bad: '#FDF5F3' };
  const color = colors[factor.status] || '#A3A3A3';
  return (
    <div>
      <div className="flex items-start justify-between gap-4 text-sm mb-2">
        <div>
          <p className="font-medium text-[#171717]">{factor.label}</p>
          {factor.detail && <p className="text-xs text-[#A3A3A3] mt-0.5">{factor.detail}</p>}
        </div>
        <span className="shrink-0 text-xs font-bold" style={{ color }}>
          {factor.score}/{factor.max}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[#EAEAE5] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${factor.percent}%`, backgroundColor: color }}
        />
      </div>
      {factor.tip && <p className="mt-1.5 text-[11px] text-[#A3A3A3]">{factor.tip}</p>}
    </div>
  );
}

function PredCard({ label, value, sub, subColor, icon }) {
  return (
    <div className="bg-white border border-[#EAEAE5] rounded-2xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-[#A3A3A3]">{label}</p>
          <p className="mt-2 font-serif text-2xl font-black text-[#171717] leading-tight">{value}</p>
          {sub && (
            <p className="mt-1.5 text-xs text-[#525252]" style={subColor ? { color: subColor } : {}}>
              {sub}
            </p>
          )}
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F3] text-[#525252]">
          {icon}
        </span>
      </div>
    </div>
  );
}

function formatFeatureName(name) {
  const map = {
    education: 'Education Level', cgpa: 'CGPA', projects: 'Project Count',
    internships: 'Internship Experience', experience: 'Work Experience',
    skills_count: 'Total Skills', frontend_skills: 'Frontend Skills',
    backend_skills: 'Backend Skills', database_skills: 'Database Skills',
    cloud_skills: 'Cloud / DevOps Skills', ml_skills: 'ML Skills',
    has_github: 'GitHub Profile', has_linkedin: 'LinkedIn Profile',
    resume_length: 'Resume Length', certifications: 'Certifications',
    achievements: 'Achievements', ats_keywords: 'ATS Keywords',
    action_verbs: 'Action Verbs', leadership: 'Leadership Signals',
    open_source: 'Open Source', has_contact: 'Contact Info',
    has_sections: 'Resume Sections', formatting_score: 'Layout Score',
  };
  return map[name] || name.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
