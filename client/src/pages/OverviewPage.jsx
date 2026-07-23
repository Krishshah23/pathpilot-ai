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
import { AppShell } from '@/components/layout/AppShell';
import { Icon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/Spinner';
import { ScoreGauge } from '@/components/charts/ScoreGauge';
import { useAuth } from '@/context/AuthContext';

import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

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
          api.get('/growth').catch(() => ({ data: { data: { plan: null } } }))
        ]);

        setPathScore(scoreRes.data.data.pathScore || {});
        setMarketSalary(scoreRes.data.data.marketSalary || null);
        setBlendedBenchmark(scoreRes.data.data.blendedBenchmark || null);
        setGrowthPlan(growthRes.data?.data?.plan || null);

        if (user?.profile?.resumeUrl) {
          fetchAiExplanation();
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [user?.profile?.resumeUrl]);

  const handleExportPDF = () => {
    navigate('/report');
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

  const score = pathScore?.displayScore ?? Math.round(pathScore?.score || 0);
  const readiness = pathScore?.readiness;
  const predictions = pathScore?.predictions;
  const peerBenchmark = pathScore?.peerBenchmark;
  const factors = pathScore?.factors || [];
  const explanations = predictions?.explanations;
  const hasResume = !!(user?.profile?.resumeUrl);

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
      <div className="space-y-8">
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EAEAE5] pb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F5F5F3] text-xs font-semibold text-[#525252] mb-2 border border-[#EAEAE5]">
              Target Role: <strong className="text-[#171717]">{dreamRole}</strong>
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#171717]">
              {greeting}, {firstName} 👋
            </h1>
            <p className="text-sm text-[#525252] mt-1">
              Here is your career readiness overview and recommended action items.
            </p>
          </div>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#EAEAE5] text-xs font-bold text-[#171717] hover:bg-[#F5F5F3] transition-colors shadow-sm self-start md:self-auto"
          >
            <Icon.Download size={15} />
            Export Career Report
          </button>
        </div>

        {/* Smart CTA Banner */}
        <div className="rounded-2xl border border-[#EAEAE5] bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F3] text-[#171717] border border-[#EAEAE5]">
              {smartCta.icon}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#171717]">{smartCta.title}</h3>
              <p className="text-xs text-[#525252] mt-1">{smartCta.desc}</p>
            </div>
          </div>
          <button
            onClick={() => navigate(smartCta.link)}
            className="px-5 py-2.5 rounded-xl bg-[#171717] text-white text-xs font-bold hover:bg-[#2a2a2a] transition-colors shrink-0"
          >
            {smartCta.btn} →
          </button>
        </div>

        {/* Main Grid: Path Score & Factor Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Path Score Card */}
          <div className="rounded-2xl border border-[#EAEAE5] bg-white p-6 shadow-sm flex flex-col items-center justify-center text-center">
            <h3 className="text-xs font-bold text-[#A3A3A3] uppercase tracking-wider mb-4">Path Score</h3>
            <ScoreGauge score={score} label={readiness?.label} />
            <p className="text-xs text-[#525252] mt-4 max-w-xs leading-relaxed">
              {readiness?.summary}
            </p>
          </div>

          {/* Factor Breakdown */}
          <div className="lg:col-span-2 rounded-2xl border border-[#EAEAE5] bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-[#A3A3A3] uppercase tracking-wider mb-4">Readiness Factors</h3>
              <div className="space-y-4">
                {factors.map((f) => (
                  <div key={f.key}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-semibold text-[#171717]">{f.label}</span>
                      <span className="text-[#525252] font-mono">{f.score} / {f.max}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#F5F5F3] overflow-hidden border border-[#EAEAE5]">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          f.status === 'good' ? 'bg-[#2B4C3F]' : f.status === 'warn' ? 'bg-amber-600' : 'bg-[#B85A3C]'
                        )}
                        style={{ width: `${f.percent}%` }}
                      />
                    </div>
                    {f.tip && <p className="text-[10px] text-[#A3A3A3] mt-1">{f.tip}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* AI Score Audit Card */}
        {hasResume && (
          <div className="rounded-2xl border border-[#EAEAE5] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5F5F3] text-[#171717]">
                <Icon.MessageSquare size={16} />
              </span>
              <h3 className="text-sm font-bold text-[#171717]">AI Career Audit Narrative</h3>
            </div>
            {loadingAi ? (
              <div className="py-6 flex items-center justify-center">
                <Spinner className="h-6 w-6 text-[#2B4C3F]" />
              </div>
            ) : (
              <div className="prose prose-sm max-w-none text-[#525252] text-xs leading-relaxed space-y-3 whitespace-pre-line">
                {aiExplanation || 'Your AI audit is being generated...'}
              </div>
            )}
          </div>
        )}

        {/* Market Salary Card */}
        {marketSalary?.available && (
          <div className="rounded-2xl border border-[#EAEAE5] bg-white p-6 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-wider">Live Market Benchmark</span>
              <h4 className="text-base font-bold text-[#171717] mt-0.5">{dreamRole} Salary Range</h4>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold font-mono text-[#2B4C3F]">
                ₹{marketSalary.min} - ₹{marketSalary.max} LPA
              </span>
              <p className="text-[10px] text-[#A3A3A3] mt-0.5">Based on live job posting analysis</p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
