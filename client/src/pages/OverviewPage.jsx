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

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/path-score');
        setPathScore(data.data.pathScore || {});
        setMarketSalary(data.data.marketSalary || null);
        setBlendedBenchmark(data.data.blendedBenchmark || null);
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, []);

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
  const score = pathScore?.displayScore ?? Math.round(pathScore?.score || 0);
  const readiness = pathScore?.readiness;
  const predictions = pathScore?.predictions;
  const peerBenchmark = pathScore?.peerBenchmark;
  const factors = pathScore?.factors || [];
  const explanations = predictions?.explanations;

  return (
    <AppShell>
      <div className="space-y-10">

        {/* ── Hero Bar ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 pb-8 border-b border-[#EAEAE5]">
          <div>
            <p className="text-sm font-medium text-[#A3A3A3] mb-2">Good morning</p>
            <h1 className="font-serif text-4xl font-bold text-[#171717] leading-tight">
              {firstName}.
            </h1>
            <p className="mt-3 text-base text-[#525252] max-w-xl leading-relaxed">
              Here's your career readiness snapshot for{' '}
              <span className="font-semibold text-[#2B4C3F]">{dreamRole}</span>.
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

        {/* ── SHAP Explainability ───────────────────────────────────── */}
        {explanations && (
          <div className="bg-white border border-[#EAEAE5] rounded-2xl p-8">
            <div className="mb-6">
              <h2 className="font-serif text-lg font-bold text-[#171717]">AI Explainability — Score Drivers</h2>
              <p className="text-sm text-[#A3A3A3] mt-1">Shapley values: mathematical impact of each resume attribute.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Positive */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#2B4C3F] mb-3 flex items-center gap-1.5">
                  <Icon.ArrowUp size={14} /> Positive Drivers
                </h3>
                <div className="space-y-2">
                  {explanations.topPositive?.map((item) => (
                    <div key={item.feature} className="flex items-center justify-between rounded-lg border border-[#EAEAE5] bg-[#F5F5F3] px-3 py-2.5 text-sm">
                      <span className="text-[#171717] font-medium">{formatFeatureName(item.feature)}</span>
                      <span className="font-mono text-xs font-bold text-[#2B4C3F]">+{item.impact.toFixed(2)}</span>
                    </div>
                  ))}
                  {!explanations.topPositive?.length && (
                    <p className="text-xs text-[#A3A3A3]">No major positive drivers yet.</p>
                  )}
                </div>
              </div>
              {/* Negative */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#B85A3C] mb-3 flex items-center gap-1.5">
                  <Icon.ArrowDown size={14} /> Negative Drivers
                </h3>
                <div className="space-y-2">
                  {explanations.topNegative?.map((item) => (
                    <div key={item.feature} className="flex items-center justify-between rounded-lg border border-[#EAEAE5] bg-[#FDF5F3] px-3 py-2.5 text-sm">
                      <span className="text-[#171717] font-medium">{formatFeatureName(item.feature)}</span>
                      <span className="font-mono text-xs font-bold text-[#B85A3C]">{item.impact.toFixed(2)}</span>
                    </div>
                  ))}
                  {!explanations.topNegative?.length && (
                    <p className="text-xs text-[#A3A3A3]">No negative drivers identified.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── AI Prediction Cards ───────────────────────────────────── */}
        {predictions && (
          <div>
            <h2 className="font-serif text-xl font-bold text-[#171717] mb-5">AI Predictive Diagnostics</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <PredCard
                label="ATS Pass Probability"
                value={`${predictions.atsProbability}%`}
                sub={predictions.atsPass ? 'Likely Pass' : 'At Risk'}
                subColor={predictions.atsPass ? '#2B4C3F' : '#B85A3C'}
                icon={<Icon.Shield size={20} />}
              />
              <PredCard
                label="Salary Projection"
                value={`₹${predictions.salaryPrediction?.salaryLPA} LPA`}
                sub={marketSalary?.available ? `Market: ₹${marketSalary.min}–₹${marketSalary.max} LPA` : 'ML model estimate'}
                icon={<Icon.DollarSign size={20} />}
              />
              <PredCard
                label="Interview Success"
                value={`${predictions.interviewProbability}%`}
                sub="Probability of clearing round 1"
                icon={<Icon.Users size={20} />}
              />
              <PredCard
                label="Recommended Role"
                value={predictions.recommendedRole?.role || '—'}
                sub={`${predictions.recommendedRole?.confidence}% confidence`}
                icon={<Icon.Sparkles size={20} />}
              />
            </div>
          </div>
        )}

        {/* ── Peer Benchmark + Market Alignment ────────────────────── */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Peer Benchmark */}
          {peerBenchmark && (
            <div className="bg-white border border-[#EAEAE5] rounded-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-serif text-base font-bold text-[#171717]">Peer Benchmark</h2>
                  <p className="text-xs text-[#A3A3A3] mt-1">vs. 50,000 synthetic student profiles</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#F5F5F3] border border-[#EAEAE5] text-[#A3A3A3] px-2 py-1 rounded-full">
                  Synthetic
                </span>
              </div>
              <div className="flex items-center gap-6">
                {/* Percentile ring */}
                <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="40" stroke="#EAEAE5" strokeWidth="7" fill="none" />
                    <circle
                      cx="48" cy="48" r="40"
                      stroke="#2B4C3F" strokeWidth="7" fill="none"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 40}
                      strokeDashoffset={2 * Math.PI * 40 * (1 - peerBenchmark.percentile / 100)}
                    />
                  </svg>
                  <div className="text-center z-10">
                    <span className="font-serif text-2xl font-black text-[#171717]">{peerBenchmark.percentile}th</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#171717]">Top {100 - peerBenchmark.percentile}% for <span className="text-[#2B4C3F]">{peerBenchmark.role}</span></p>
                  <p className="text-xs text-[#525252]">You score higher than {peerBenchmark.percentile}% of peers.</p>
                  <div className="flex gap-4 mt-3 text-xs text-[#A3A3A3]">
                    <span>Min: <b className="text-[#171717]">{peerBenchmark.min}</b></span>
                    <span>Avg: <b className="text-[#171717]">{peerBenchmark.mean}</b></span>
                    <span>Max: <b className="text-[#171717]">{peerBenchmark.max}</b></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live Market Alignment */}
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

        {/* ── AI Recommendations ───────────────────────────────────── */}
        {predictions?.recommendations?.length > 0 && (
          <div className="bg-white border border-[#EAEAE5] rounded-2xl p-8">
            <h2 className="font-serif text-lg font-bold text-[#171717] mb-5">AI Career Improvement Roadmap</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {predictions.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-3 rounded-xl border border-[#EAEAE5] bg-[#F5F5F3] px-4 py-3 text-sm text-[#525252]">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#171717] text-xs font-bold text-white mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
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
