/**
 * pages/OverviewPage.jsx — Candidate Command Center Dashboard (/dashboard)
 *
 * ARCHITECTURAL ROLE:
 * The primary dashboard landing page for authenticated candidates.
 *
 * DASHBOARD CARDS & WIDGETS:
 * 1. Greeting & Smart Action Header: Welcomes student, displays target role, and provides a dynamic
 *    smart call-to-action button based on progress (Upload Resume -> Build Roadmap -> Start Practice).
 * 2. Path Score Gauge: Displays canonical weighted Path Score (0-100), readiness tier badge,
 *    and 4 factor score breakdowns (Resume Quality, Skills, Projects, Profile Completion).
 * 3. AI Score Audit Card: Rendered only when an analyzed resume is present. Displays pre-generated
 *    Gemini coaching narrative explaining exact strengths and score blockers.
 * 4. Salary Projection Card: Displays live market salary range (in INR LPA) sourced from Adzuna data.
 * 5. Quick Hub Shortcuts: Cards linking to Talent Analyzer, Execution Engine, and Interview Prep.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/layout/AppShell';
import { fadeInUp, staggerContainer } from '@/lib/motion';
import { Icon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/Spinner';
import { ScoreGauge } from '@/components/charts/ScoreGauge';
import { PeerBenchmarkCard } from '@/components/dashboard/PeerBenchmarkCard';
import { JobCard } from '@/components/jobs/JobCard';
import { matchJobToSkills } from '@/lib/jobMatch';
import { AppTour } from '@/components/tour/AppTour';
import { useAuth } from '@/context/AuthContext';

import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useCollapsedSections } from '@/lib/useCollapsedSections';

/** Small persisted collapse/expand toggle for secondary dashboard cards. */
function CollapseToggle({ collapsed, onClick, label }) {
  return (
    <button
      onClick={onClick}
      aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
      aria-expanded={!collapsed}
      className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-faint hover:text-ink hover:bg-surface-2 transition-colors"
    >
      <Icon.ChevronDown size={14} className={cn('transition-transform', collapsed && '-rotate-90')} />
    </button>
  );
}

/** Animates a number from 0 up to `target` using an ease-out curve. */
function useCountUp(target, duration = 1000) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

const FACTOR_GRADIENTS = {
  good: 'linear-gradient(90deg, #2B4C3F, #4A8067)',
  warn: 'linear-gradient(90deg, #92400E, #C9832E)',
  bad: 'linear-gradient(90deg, #B85A3C, #D97D5E)',
};

const FEATURE_HUB = [
  {
    title: 'Resume Strategy',
    desc: 'AI-driven resume audit and gap analysis against your dream role.',
    link: '/talent-analyzer',
    icon: <Icon.FileText size={20} />,
  },
  {
    title: 'Skill Roadmap',
    desc: 'A personalized week-by-week growth plan to close every skill gap.',
    link: '/execution-engine',
    icon: <Icon.Route size={20} />,
  },
  {
    title: 'Interview Prep',
    desc: 'Practice role-specific mock interviews with instant AI feedback.',
    link: '/interview-prep',
    icon: <Icon.Award size={20} />,
  },
];

const ONBOARDING_STEPS = [
  { n: 1, title: 'Upload Resume', desc: 'AI parses and analyzes it in seconds.', icon: <Icon.Upload size={18} /> },
  { n: 2, title: 'Get Your Path Score', desc: 'A 0-100 career readiness score, instantly.', icon: <Icon.Gauge size={18} /> },
  { n: 3, title: 'Follow Your Roadmap', desc: 'A personalized plan closes every gap.', icon: <Icon.Route size={18} /> },
];

/** New-user empty state shown on Overview until a resume has been uploaded. */
function EmptyStateHero({ navigate }) {
  return (
    <div className="card p-10 sm:p-14 text-center max-w-2xl mx-auto">
      <span
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white mb-5 shadow-sm"
        style={{ background: 'linear-gradient(135deg, var(--brand-grad-from, #2D6A4F), var(--brand-grad-to, #40916C))' }}
      >
        <Icon.Sparkles size={24} />
      </span>
      <h2 className="font-serif text-2xl font-bold text-ink">Let's build your career profile</h2>
      <p className="text-sm text-muted mt-2 max-w-md mx-auto">
        It takes about 2 minutes. Start by uploading your resume.
      </p>

      <div className="grid sm:grid-cols-3 gap-4 mt-8 text-left">
        {ONBOARDING_STEPS.map((s) => (
          <div key={s.n} className="rounded-xl border border-line bg-surface-2 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface border border-line text-brand text-xs font-bold">
                {s.n}
              </span>
              <span className="text-muted">{s.icon}</span>
            </div>
            <p className="text-xs font-bold text-ink">{s.title}</p>
            <p className="text-[11px] text-faint mt-1 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate('/talent-analyzer')}
        className="btn-gradient mt-8 px-6 py-3 rounded-xl text-sm font-bold inline-flex items-center gap-2"
      >
        Upload Your Resume <Icon.ArrowRight size={15} />
      </button>
      <div className="mt-3">
        <button
          onClick={() => navigate('/resume-builder')}
          className="text-xs font-semibold text-muted hover:text-brand transition-colors"
        >
          Or build one from scratch →
        </button>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [pathScore, setPathScore] = useState(null);
  const [marketSalary, setMarketSalary] = useState(null);
  const [blendedBenchmark, setBlendedBenchmark] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [growthPlan, setGrowthPlan] = useState(null);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [barsFilled, setBarsFilled] = useState(false);
  const [peerBenchmark, setPeerBenchmark] = useState(null);
  const [loadingBenchmark, setLoadingBenchmark] = useState(true);
  const [hasResumeBuilder, setHasResumeBuilder] = useState(false);
  const [liveJobs, setLiveJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const { isCollapsed, toggle: toggleSection } = useCollapsedSections();

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => setBarsFilled(true), 50);
    return () => clearTimeout(t);
  }, [loading]);

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
        const [scoreRes, growthRes, resumeBuilderRes] = await Promise.all([
          api.get('/path-score'),
          api.get('/growth').catch(() => ({ data: { data: { plan: null } } })),
          api.get('/resume-builder').catch(() => ({ data: { data: { exists: false } } })),
        ]);

        setPathScore(scoreRes.data.data.pathScore || {});
        setMarketSalary(scoreRes.data.data.marketSalary || null);
        setBlendedBenchmark(scoreRes.data.data.blendedBenchmark || null);
        setGrowthPlan(growthRes.data?.data?.plan || null);
        setHasResumeBuilder(!!resumeBuilderRes.data?.data?.exists);

        if (user?.profile?.resumeUrl) {
          fetchAiExplanation();
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [user?.profile?.resumeUrl]);

  useEffect(() => {
    api.get('/path-score/peer-benchmark')
      .then((res) => setPeerBenchmark(res.data.data.benchmark))
      .catch(() => setPeerBenchmark(null))
      .finally(() => setLoadingBenchmark(false));
  }, []);

  /* Live Opportunities widget (9B) — top listings preview for the user's dream role */
  useEffect(() => {
    const dr = user?.profile?.dreamRole;
    if (!dr) { setLoadingJobs(false); return; }
    api.get(`/live-jobs?role=${encodeURIComponent(dr)}`)
      .then((res) => setLiveJobs(res.data.data.jobs || []))
      .catch(() => setLiveJobs([]))
      .finally(() => setLoadingJobs(false));
  }, [user?.profile?.dreamRole]);

  const handleExportPDF = () => {
    navigate('/report');
  };

  const score = pathScore?.displayScore ?? Math.round(pathScore?.score || 0);
  const animatedScore = useCountUp(score);

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

  const readiness = pathScore?.readiness;
  const predictions = pathScore?.predictions;
  const factors = pathScore?.factors || [];
  const explanations = predictions?.explanations;
  const hasResume = !!(user?.profile?.resumeUrl);
  const isNewUser = !hasResume;

  const showSalaryCard = marketSalary?.available === true
    && typeof marketSalary?.min === 'number'
    && typeof marketSalary?.max === 'number'
    && marketSalary.min > 0
    && marketSalary.max > 0
    && marketSalary.min !== marketSalary.max;

  let smartCta = {
    title: 'Build your resume',
    desc: 'Create a polished, ATS-optimized resume with our built-in editor and AI writing help.',
    btn: 'Build Resume',
    link: '/resume-builder',
    icon: <Icon.FileText size={20} />
  };

  if (!hasResume && hasResumeBuilder) {
    smartCta = {
      title: 'Analyze your resume',
      desc: 'Run your resume against your target role to unlock your AI career audit, gap analysis, and path score.',
      btn: 'Analyze Resume',
      link: '/talent-analyzer',
      icon: <Icon.Sparkles size={20} />
    };
  }

  if (hasResume) {
    if (!growthPlan) {
      smartCta = {
        title: 'Generate your skill roadmap',
        desc: 'Turn your gap analysis into a customized week-by-week plan.',
        btn: 'Build Roadmap',
        link: '/execution-engine',
        icon: <Icon.Target size={20} />
      };
    } else {
      smartCta = {
        title: 'Practice mock interview',
        desc: 'Test your gap coverage with role-specific AI interview questions.',
        btn: 'Start Practice',
        link: '/interview-prep',
        icon: <Icon.Award size={20} />
      };
    }
  }

  return (
    <AppShell>
      <AppTour navigate={navigate} />
      <div className="space-y-8">
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2 text-xs font-semibold text-muted mb-2 border border-line">
              Target Role: <strong className="text-ink">{dreamRole}</strong>
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink">
              {greeting}, <span className="text-gradient-emerald">{firstName}</span> 👋
            </h1>
            <p className="text-sm text-muted mt-1">
              Here is your career readiness overview and recommended action items.
            </p>
          </div>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-line text-xs font-bold text-ink hover:bg-surface-2 transition-colors shadow-sm self-start md:self-auto"
          >
            <Icon.Download size={15} />
            Export Career Report
          </button>
        </div>

        {isNewUser ? (
          <EmptyStateHero navigate={navigate} />
        ) : (
        <>
        {/* Smart CTA Banner — premium dark gradient treatment */}
        <div className="banner-premium relative overflow-hidden rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Decorative glow illustration, right side */}
          <div
            className="hidden md:block absolute -right-10 -top-10 h-40 w-40 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(127,181,160,0.25) 0%, transparent 70%)' }}
          />
          <div className="flex items-start gap-4 relative z-10">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white border border-white/10">
              {smartCta.icon}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{smartCta.title}</h3>
              <p className="text-xs text-white/60 mt-1 max-w-md">{smartCta.desc}</p>
            </div>
          </div>
          <button
            onClick={() => navigate(smartCta.link)}
            className="btn-gradient relative z-10 px-6 py-3 rounded-xl text-sm font-bold shrink-0"
          >
            {smartCta.btn} →
          </button>
        </div>

        {/* Main Grid: Path Score & Factor Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Path Score Card — luxury dark card with glowing border */}
          <div
            data-tour="path-score-card"
            className="relative overflow-hidden rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center border border-[#1E2530]"
            style={{
              background: 'linear-gradient(160deg, #0F1319 0%, #141A24 50%, #0D1117 100%)',
              boxShadow: '0 0 0 1px rgba(52,211,153,0.12), 0 20px 50px -12px rgba(0,0,0,0.7)',
            }}
          >
            <span
              className="absolute top-4 right-4 inline-flex items-center rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm"
              style={{ background: 'linear-gradient(135deg, #059669, #34D399)' }}
            >
              {readiness?.label ?? 'Score'}
            </span>
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">Path Score</h3>
            <ScoreGauge score={animatedScore} label={readiness?.label} dark />
            <p className="text-xs text-white/60 mt-4 max-w-xs leading-relaxed">
              {readiness?.summary}
            </p>
          </div>

          {/* Factor Breakdown */}
          <div className="card lg:col-span-2 p-6 flex flex-col justify-between">
            <div>
              <h3 className="section-heading-accent text-xs font-bold text-faint uppercase tracking-wider mb-4">Readiness Factors</h3>
              <div className="space-y-4">
                {factors.map((f, i) => (
                  <div key={f.key} className={cn('animate-fade-up', `stagger-${Math.min(5, i + 1)}`)}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-semibold text-ink">{f.label}</span>
                      <span className="text-muted font-mono">{f.score} / {f.max}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-2 overflow-hidden border border-line">
                      <div
                        className="h-full rounded-full transition-all ease-out"
                        style={{
                          width: barsFilled ? `${f.percent}%` : '0%',
                          background: FACTOR_GRADIENTS[f.status] || FACTOR_GRADIENTS.good,
                          transitionDuration: '900ms',
                          transitionDelay: `${i * 120}ms`,
                        }}
                      />
                    </div>
                    {f.tip && <p className="text-[10px] text-faint mt-1">{f.tip}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Live Opportunities Widget — promoted above the fold since real-time job
            matches are one of the highest-value, most action-ready signals on the
            dashboard; previously buried below Peer Benchmarking. */}
        {user?.profile?.dreamRole && (loadingJobs || liveJobs.length > 0) && (
          <div className="card p-6 border-brand/25 relative overflow-hidden">
            <div
              className="absolute inset-x-0 top-0 h-0.5"
              style={{ background: 'linear-gradient(90deg, transparent, #10B981, transparent)' }}
            />
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand border border-brand/20">
                  <Icon.Briefcase size={15} />
                </span>
                <div className="flex items-center gap-2">
                  <h3 className="section-heading-accent text-sm font-bold text-ink">Live Opportunities</h3>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand" />
                  </span>
                </div>
                {!loadingJobs && (
                  <span className="text-[10px] font-bold text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full">
                    {liveJobs.length} open now for {dreamRole}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => navigate('/live-jobs')}
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  View All Live Jobs →
                </button>
                <CollapseToggle collapsed={isCollapsed('liveJobs')} onClick={() => toggleSection('liveJobs')} label="Live Opportunities" />
              </div>
            </div>

            {!isCollapsed('liveJobs') && (
              loadingJobs ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-10 rounded-lg bg-surface-2 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {liveJobs.slice(0, 3).map((job) => (
                    <JobCard key={job.id} job={job} matchTier={matchJobToSkills(user?.profile?.skills, job)} variant="compact" />
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {/* Peer Benchmarking Card */}
        <PeerBenchmarkCard benchmark={peerBenchmark} loading={loadingBenchmark} />

        {/* AI Score Audit Card */}
        {hasResume && (
          <div className="card p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-2 text-ink">
                  <Icon.MessageSquare size={16} />
                </span>
                <h3 className="section-heading-accent text-sm font-bold text-ink">AI Career Audit Narrative</h3>
              </div>
              <CollapseToggle collapsed={isCollapsed('aiNarrative')} onClick={() => toggleSection('aiNarrative')} label="AI Career Audit Narrative" />
            </div>
            {!isCollapsed('aiNarrative') && (
              loadingAi ? (
                <div className="py-6 flex items-center justify-center">
                  <Spinner className="h-6 w-6 text-brand" />
                </div>
              ) : (
                <div className="prose prose-sm max-w-none text-muted text-xs leading-relaxed space-y-3 whitespace-pre-line">
                  {aiExplanation || 'Your AI audit is being generated...'}
                </div>
              )
            )}
          </div>
        )}

        {/* Market Salary Card */}
        {showSalaryCard && (
          <div className="card p-5 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-40" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand" />
                </span>
                <span className="text-[10px] font-bold text-brand uppercase tracking-wider">
                  Live Market Benchmark
                </span>
              </div>
              <h4 className="text-sm font-bold text-ink">{dreamRole} Salary Range</h4>
              {!isCollapsed('salary') && (
                <p className="text-[10px] text-muted mt-0.5">Estimated from live job postings · Data may vary</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <span className="text-lg font-bold font-mono text-brand">
                  ₹{marketSalary.min}L – ₹{marketSalary.max}L
                </span>
                {!isCollapsed('salary') && <p className="text-[10px] text-muted mt-0.5">per annum</p>}
              </div>
              <CollapseToggle collapsed={isCollapsed('salary')} onClick={() => toggleSection('salary')} label="Salary Range" />
            </div>
          </div>
        )}

        {/* Feature Hub Shortcuts */}
        <div>
          <h3 className="section-heading-accent text-xs font-bold text-faint uppercase tracking-wider mb-4">Jump Back In</h3>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer(0.05)}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {FEATURE_HUB.map((hub) => (
              <motion.button
                key={hub.link}
                variants={fadeInUp}
                onClick={() => navigate(hub.link)}
                className="card card-hover btn-press group text-left p-5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-ink border border-line transition-colors duration-300 group-hover:bg-brand group-hover:text-white">
                  {hub.icon}
                </div>
                <h4 className="text-sm font-bold text-ink mt-4">{hub.title}</h4>
                <p className="text-xs text-muted mt-1 leading-relaxed">{hub.desc}</p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand mt-3 opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                  Open <Icon.ArrowRight size={13} />
                </span>
              </motion.button>
            ))}
          </motion.div>
        </div>
        </>
        )}
      </div>
    </AppShell>
  );
}
