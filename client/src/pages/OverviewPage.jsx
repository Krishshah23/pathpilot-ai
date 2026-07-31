/**
 * pages/OverviewPage.jsx — Candidate Command Center Dashboard (/dashboard)
 *
 * ARCHITECTURAL ROLE:
 * The primary dashboard landing page for authenticated candidates, organized
 * into four clear zones instead of a long stack of uniform bordered cards:
 * 1. Header — greeting + a slim smart-action prompt.
 * 2. Hero — the Path Score (the single most important number on the page)
 *    together with the factor breakdown, in one unified card.
 * 3. Secondary — a compact Live Jobs teaser (max 3 listings) linking out to
 *    the full /live-jobs page.
 * 4. Consolidated Insights — AI Career Audit, Peer Benchmarking, and Market
 *    Salary merged into one tabbed card instead of three separate ones.
 * Feature Hub shortcuts close out the page.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/layout/AppShell';
import { fadeInUp, staggerContainer } from '@/lib/motion';
import { Icon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { ScoreGauge } from '@/components/charts/ScoreGauge';
import { PeerBenchmarkCard } from '@/components/dashboard/PeerBenchmarkCard';
import { JobCard } from '@/components/jobs/JobCard';
import { matchJobToSkills } from '@/lib/jobMatch';
import { AppTour } from '@/components/tour/AppTour';
import { useAuth } from '@/context/AuthContext';

import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

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
  good: 'var(--color-brand)',
  warn: 'var(--color-warning)',
  bad: 'var(--color-danger)',
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
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white mb-5 shadow-sm"
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

      <Button
        onClick={() => navigate('/talent-analyzer')}
        className="mt-8"
        size="lg"
      >
        Upload Your Resume <Icon.ArrowRight size={15} />
      </Button>
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
  const [insightTab, setInsightTab] = useState('ai');

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

  /* Live Opportunities teaser — top 3 listings preview for the user's dream role */
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
          <Spinner className="h-8 w-8 text-brand" />
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
    icon: <Icon.FileText size={18} />
  };

  if (!hasResume && hasResumeBuilder) {
    smartCta = {
      title: 'Analyze your resume',
      desc: 'Run your resume against your target role to unlock your AI career audit, gap analysis, and path score.',
      btn: 'Analyze Resume',
      link: '/talent-analyzer',
      icon: <Icon.Sparkles size={18} />
    };
  }

  if (hasResume) {
    if (!growthPlan) {
      smartCta = {
        title: 'Generate your skill roadmap',
        desc: 'Turn your gap analysis into a customized week-by-week plan.',
        btn: 'Build Roadmap',
        link: '/execution-engine',
        icon: <Icon.Target size={18} />
      };
    } else {
      smartCta = {
        title: 'Practice mock interview',
        desc: 'Test your gap coverage with role-specific AI interview questions.',
        btn: 'Start Practice',
        link: '/interview-prep',
        icon: <Icon.Award size={18} />
      };
    }
  }

  /* Consolidated Insights — only include tabs that actually have something to show */
  const insightSections = [
    hasResume && { id: 'ai', label: 'AI Audit', icon: Icon.MessageSquare },
    { id: 'peer', label: 'Peer Benchmark', icon: Icon.Users },
    showSalaryCard && { id: 'salary', label: 'Salary', icon: Icon.DollarSign },
  ].filter(Boolean);
  const activeInsight = insightSections.some((s) => s.id === insightTab) ? insightTab : insightSections[0]?.id;

  return (
    <AppShell>
      <AppTour navigate={navigate} />
      <div className="space-y-10">
        {/* ── Zone 1: Header ──────────────────────────────────────── */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

          {!isNewUser && (
            /* Slim smart-action prompt — light system, not a heavy dark banner */
            <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-line bg-surface-2 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-brand border border-line">
                  {smartCta.icon}
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">{smartCta.title}</p>
                  <p className="text-xs text-muted mt-0.5">{smartCta.desc}</p>
                </div>
              </div>
              <Button onClick={() => navigate(smartCta.link)} className="shrink-0">
                {smartCta.btn} <Icon.ArrowRight size={14} />
              </Button>
            </div>
          )}
        </div>

        {isNewUser ? (
          <EmptyStateHero navigate={navigate} />
        ) : (
        <>
        {/* ── Zone 2: Hero — Path Score dominates, factors live alongside it ── */}
        <div data-tour="path-score-card" className="card p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 lg:gap-12 items-center">
            {/* Path Score gauge */}
            <div className="flex flex-col items-center text-center mx-auto lg:mx-0">
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white bg-brand shadow-sm mb-4">
                {readiness?.label ?? 'Score'}
              </span>
              <ScoreGauge score={animatedScore} label={readiness?.label} size={200} />
              <p className="text-xs text-muted mt-4 max-w-xs leading-relaxed">
                {readiness?.summary}
              </p>
            </div>

            {/* Factor Breakdown */}
            <div className="w-full lg:border-l lg:border-line lg:pl-12">
              <h3 className="text-xs font-bold text-faint uppercase tracking-wider mb-4">Readiness Factors</h3>
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

        {/* ── Zone 3: Secondary — compact Live Jobs teaser ─────────── */}
        {user?.profile?.dreamRole && (loadingJobs || liveJobs.length > 0) && (
          <div className="rounded-2xl border border-line p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Icon.Briefcase size={14} className="text-faint" />
                <h3 className="text-xs font-bold text-faint uppercase tracking-wider">Live Opportunities</h3>
              </div>
              <button
                onClick={() => navigate('/live-jobs')}
                className="text-xs font-semibold text-brand hover:underline"
              >
                View All Live Jobs →
              </button>
            </div>

            {loadingJobs ? (
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
            )}
          </div>
        )}

        {/* ── Zone 4: Consolidated Insights — AI Audit + Peer Benchmark + Salary ── */}
        {insightSections.length > 0 && (
          <div className="card overflow-hidden">
            {insightSections.length > 1 && (
              <div className="p-4 border-b border-line">
                <div className="apple-segmented w-full">
                  {insightSections.map((s) => {
                    const isActive = activeInsight === s.id;
                    const SIcon = s.icon;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setInsightTab(s.id)}
                        className={cn(
                          'btn-press apple-segmented-item flex-1 py-2 px-3 text-[13px] flex items-center justify-center gap-1.5',
                          isActive ? 'text-white' : 'text-faint hover:text-muted'
                        )}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="insight-tab-indicator"
                            className="absolute inset-0 -z-10 rounded-full bg-brand"
                            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                          />
                        )}
                        <span className="relative flex items-center gap-1.5"><SIcon size={13} /> {s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="p-6">
              {activeInsight === 'ai' && (
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

              {activeInsight === 'peer' && (
                <PeerBenchmarkCard benchmark={peerBenchmark} loading={loadingBenchmark} bare />
              )}

              {activeInsight === 'salary' && showSalaryCard && (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                      Live Market Benchmark
                    </span>
                    <h4 className="text-sm font-bold text-ink mt-1">{dreamRole} Salary Range</h4>
                    <p className="text-[10px] text-muted mt-0.5">Estimated from live job postings · Data may vary</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-bold font-mono text-brand">
                      ₹{marketSalary.min}L – ₹{marketSalary.max}L
                    </span>
                    <p className="text-[10px] text-muted mt-0.5">per annum</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Feature Hub Shortcuts ──────────────────────────────── */}
        <div>
          <h3 className="text-xs font-bold text-faint uppercase tracking-wider mb-4">Jump Back In</h3>
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
