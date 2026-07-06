import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Icon } from '@/components/ui/icons';
import { ConfidenceTag } from '@/components/ui/ConfidenceTag';
import { ScoreGauge } from '@/components/charts/ScoreGauge';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

const BAR_COLORS = {
  good: 'bg-success',
  warn: 'bg-warning',
  bad: 'bg-danger',
};

const TEXT_COLORS = {
  good: 'text-success',
  warn: 'text-warning',
  bad: 'text-danger',
};

export default function PathScorePage() {
  const navigate = useNavigate();
  const [pathScore, setPathScore] = useState(null);
  const [marketSalary, setMarketSalary] = useState(null);
  const [blendedBenchmark, setBlendedBenchmark] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/path-score');
      setPathScore(data.data.pathScore);
      setMarketSalary(data.data.marketSalary || null);
      setBlendedBenchmark(data.data.blendedBenchmark || null);
    } catch (err) {
      setError(errorMessage(err, 'Could not load Path Score'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const actions = (
    <Button size="sm" variant="outline" onClick={() => navigate('/gap')}>
      <Icon.Target size={16} /> Open Gap Navigator
    </Button>
  );

  return (
    <AppShell title="Path Score" subtitle="Explainable career-readiness scoring" actions={actions}>
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8 text-brand" />
        </div>
      ) : error ? (
        <Card>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-danger">{error}</p>
            <Button size="sm" variant="outline" onClick={load}>
              Try again
            </Button>
          </div>
        </Card>
      ) : (
        <PathScoreContent
          pathScore={pathScore}
          marketSalary={marketSalary}
          blendedBenchmark={blendedBenchmark}
          onResume={() => navigate('/resume')}
        />
      )}
    </AppShell>
  );
}

function formatFeatureName(name) {
  const mapping = {
    education: 'Education Level',
    cgpa: 'CGPA / Grade Point',
    projects: 'Project Count',
    internships: 'Internship Experience',
    experience: 'Work Experience',
    skills_count: 'Total Skills',
    frontend_skills: 'Frontend Skills',
    backend_skills: 'Backend Skills',
    database_skills: 'Database Skills',
    cloud_skills: 'Cloud/DevOps Skills',
    ml_skills: 'Machine Learning Skills',
    has_github: 'GitHub Profile Link',
    has_linkedin: 'LinkedIn Profile Link',
    resume_length: 'Resume Length (Words)',
    certifications: 'Professional Certifications',
    achievements: 'Notable Achievements',
    ats_keywords: 'ATS Keywords Matching',
    action_verbs: 'Resume Action Verbs',
    leadership: 'Leadership Signaling',
    open_source: 'Open Source Contributions',
    has_contact: 'Contact Info Present',
    has_sections: 'Resume Section Layout',
    formatting_score: 'Visual Layout Score',
  };
  return mapping[name] || name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function PathScoreContent({ pathScore, marketSalary, blendedBenchmark, onResume }) {
  const readiness = pathScore.readiness || {};
  const readinessLabel = readiness.level || readiness.label || pathScore.label;
  const predictions = pathScore.predictions || null;
  const peerBenchmark = pathScore.peerBenchmark || null;

  return (
    <div className="space-y-6">
      {/* Core Score Section */}
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="flex flex-col items-center justify-center text-center">
          <p className="text-sm font-medium text-muted">Overall score</p>
          <ScoreGauge score={pathScore.score} size={220} label={readinessLabel} />
          {predictions?.resumeScoreConfidence && (
            <ConfidenceTag confidence={predictions.resumeScoreConfidence} size="sm" className="mt-2" />
          )}
          <p className="mt-3 max-w-xs text-sm text-muted">{readiness.summary || pathScore.summary}</p>
          <Button
            size="sm"
            variant="ghost"
            className="mt-3 text-brand-soft hover:bg-brand/10 hover:text-brand"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-ai-coach', { detail: { type: 'pathScore' } }));
            }}
          >
            <Icon.Sparkles size={14} className="mr-1.5" /> Ask Why
          </Button>
        </Card>

        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-ink">Score factors</h2>
              <p className="mt-1 text-sm text-muted">
                Each point comes from resume quality, skills, projects, or profile completion.
              </p>
            </div>
            {!pathScore.resume && (
              <Button size="sm" variant="outline" onClick={onResume}>
                <Icon.FileText size={16} /> Analyze resume
              </Button>
            )}
          </div>

          <div className="mt-6 space-y-5">
            {pathScore.factors.map((factor) => (
              <FactorBar key={factor.key} factor={factor} />
            ))}
          </div>
        </Card>
      </div>

      {/* Peer Benchmarking & Market Alignment */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Peer Benchmarking Card */}
        <Card className="flex flex-col justify-between border-line/60 bg-gradient-to-br from-surface to-brand/5 shadow-md">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-semibold text-ink flex items-center gap-1.5">
                  <Icon.Users size={18} className="text-brand" />
                  Peer Benchmarking
                </h3>
                <p className="mt-1 text-xs text-muted">
                  Your Path Score compared against other students targeting same role.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand uppercase tracking-wider">
                Synthetic Dataset
              </span>
            </div>

            {peerBenchmark && (
              <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
                {/* Radial Percentile Indicator */}
                <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-brand/5 border border-brand/20">
                  <svg className="absolute inset-0 h-full w-full -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      className="stroke-line/20"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      className="stroke-brand transition-all duration-500 ease-out"
                      strokeWidth="8"
                      strokeDasharray={2 * Math.PI * 48}
                      strokeDashoffset={2 * Math.PI * 48 * (1 - peerBenchmark.percentile / 100)}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                  <div className="text-center z-10">
                    <span className="font-display text-2xl font-bold text-ink">
                      {Math.round(peerBenchmark.percentile)}th
                    </span>
                    <p className="text-[10px] font-medium text-muted">Percentile</p>
                  </div>
                </div>

                <div className="space-y-3 text-center sm:text-left">
                  <p className="text-sm font-medium text-ink">
                    Target Role: <span className="font-bold text-brand">{peerBenchmark.role}</span>
                  </p>
                  <p className="text-xs text-muted leading-relaxed">
                    You score higher than <span className="font-semibold text-brand">{Math.round(peerBenchmark.percentile)}%</span> of peers targetting this role.
                  </p>
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-2/40 border border-line p-2 text-center text-xs">
                    <div>
                      <p className="text-[10px] text-faint uppercase font-semibold">Min</p>
                      <p className="font-bold text-ink">{peerBenchmark.min}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-faint uppercase font-semibold">Average</p>
                      <p className="font-bold text-ink">{peerBenchmark.mean}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-faint uppercase font-semibold">Max</p>
                      <p className="font-bold text-ink">{peerBenchmark.max}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 border-t border-line/40 pt-3 text-[10px] text-faint flex items-center gap-1">
            <Icon.Info size={11} />
            Honest Notice: Benchmarks calculated against 50,000 synthetic student profiles.
          </div>
        </Card>

        {/* Live Market Skill Demand Alignment Card */}
        <Card className="flex flex-col justify-between border-line/60 bg-gradient-to-br from-surface to-success/5 shadow-md">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-semibold text-ink flex items-center gap-1.5">
                  <Icon.Target size={18} className="text-success" />
                  Live Skill Demand Alignment
                </h3>
                <p className="mt-1 text-xs text-muted">
                  Your skill profile vs. current market requirements in India.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success uppercase tracking-wider">
                Live Market Data
              </span>
            </div>

            {blendedBenchmark && blendedBenchmark.available ? (
              <div className="mt-5 space-y-4">
                {/* Stats Bar */}
                <div className="flex items-center justify-between rounded-xl border border-success/10 bg-success/5 p-3 text-sm">
                  <div className="text-center sm:text-left">
                    <p className="text-xs text-muted">Skill Match Rate</p>
                    <p className="mt-1 font-display text-xl font-bold text-success">{blendedBenchmark.matchRate}%</p>
                  </div>
                  <div className="h-8 w-px bg-success/20"></div>
                  <div className="text-center sm:text-left">
                    <p className="text-xs text-muted">Avg. Skill Demand</p>
                    <p className="mt-1 font-display text-xl font-bold text-ink">{blendedBenchmark.avgMarketDemand}%</p>
                  </div>
                  <div className="h-8 w-px bg-success/20"></div>
                  <div className="text-center sm:text-left">
                    <p className="text-xs text-muted">Analyzed Listings</p>
                    <p className="mt-1 font-display text-xl font-bold text-ink">{blendedBenchmark.sampleSize}</p>
                  </div>
                </div>

                {/* Top 3 Demand Skills Grid */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Top Market Skills & Your Coverage</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {blendedBenchmark.skills.slice(0, 4).map((item) => (
                      <div key={item.skill} className="flex items-center justify-between rounded-lg border border-line bg-surface-2/30 px-2.5 py-1.5 text-xs">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink">{item.skill}</p>
                          <p className="text-[10px] text-faint">Demand: {item.demand}%</p>
                        </div>
                        <span className={cn(
                          'rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0',
                          item.matched ? 'bg-success/15 text-success' : 'bg-line text-muted'
                        )}>
                          {item.matched ? 'Matched' : 'Missing'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-10 flex flex-col items-center justify-center text-center p-4">
                <Icon.FileText className="text-faint h-8 w-8 mb-2" />
                <p className="text-xs text-muted">No market data available for target role.</p>
                <p className="text-[10px] text-faint mt-1">Set a Dream Role in your profile to enable live market alignment.</p>
              </div>
            )}
          </div>
          <div className="mt-4 border-t border-line/40 pt-3 text-[10px] text-faint flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Icon.Info size={11} />
              Source: Live job market signals from Adzuna (India).
            </span>
            {blendedBenchmark?.lastUpdated && (
              <span>
                Updated {new Date(blendedBenchmark.lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
        </Card>
      </div>

      {/* ML Predictive Insights Section */}
      {predictions && (
        <div className="space-y-6">
          <div className="border-t border-line pt-6">
            <h2 className="font-display text-lg font-bold text-ink">AI Predictive Diagnostics</h2>
            <p className="text-sm text-muted">Intelligent forecasts generated by our 7 trained machine learning models.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden bg-gradient-to-br from-surface to-brand/5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand">ATS Pass Probability</p>
                  <p className="mt-2 font-display text-3xl font-bold text-ink">{predictions.atsProbability}%</p>
                  <span className={cn(
                    'mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold',
                    predictions.atsPass ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                  )}>
                    <Icon.Shield size={12} />
                    {predictions.atsPass ? 'Likely Pass' : 'At Risk'}
                  </span>
                  {predictions.atsConfidence && (
                    <ConfidenceTag confidence={predictions.atsConfidence} className="mt-2" />
                  )}
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Icon.Shield size={20} />
                </span>
              </div>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-surface to-success/5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-success">Salary Projection</p>
                  <p className="mt-2 font-display text-3xl font-bold text-ink">₹{predictions.salaryPrediction?.salaryLPA} LPA</p>
                  <p className="mt-2 text-xs text-muted">ML model projection</p>
                  {predictions.salaryPrediction?.confidence && (
                    <ConfidenceTag
                      confidence={predictions.salaryPrediction.confidence}
                      marketBacked={marketSalary?.available}
                      className="mt-2"
                    />
                  )}
                  {marketSalary?.available && marketSalary.min != null && (
                    <div className="mt-3 rounded-lg border border-success/20 bg-success/5 px-2.5 py-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-success/80">Live market range</p>
                      <p className="mt-0.5 text-sm font-bold text-success">
                        ₹{marketSalary.min} — ₹{marketSalary.max} LPA
                      </p>
                      {marketSalary.lastUpdated && (
                        <p className="mt-0.5 text-[10px] text-faint">
                          Updated {new Date(marketSalary.lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
                  <Icon.DollarSign size={20} />
                </span>
              </div>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-surface to-warning/5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-warning">Interview Success Probability</p>
                  <p className="mt-2 font-display text-3xl font-bold text-ink">{predictions.interviewProbability}%</p>
                  <p className="mt-2 text-xs text-muted">Probability of clearing round 1</p>
                  {predictions.interviewConfidence && (
                    <ConfidenceTag confidence={predictions.interviewConfidence} className="mt-2" />
                  )}
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
                  <Icon.Users size={20} />
                </span>
              </div>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-surface to-purple-500/5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-purple-500">AI Recommended Role</p>
                  <p className="mt-2 font-display text-lg font-bold text-ink leading-tight">{predictions.recommendedRole?.role}</p>
                  <p className="mt-2 text-xs text-muted">Confidence: {predictions.recommendedRole?.confidence}%</p>
                  {predictions.recommendedRole?.confidenceTag && (
                    <ConfidenceTag confidence={predictions.recommendedRole.confidenceTag} className="mt-2" />
                  )}
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                  <Icon.Sparkles size={20} />
                </span>
              </div>
            </Card>
          </div>

          {/* Explainable AI (SHAP Explanations) */}
          {predictions.explanations && (
            <Card>
              <div className="border-b border-line pb-4 mb-4">
                <h3 className="font-display text-base font-semibold text-ink flex items-center gap-2">
                  <Icon.Gauge size={18} className="text-brand" />
                  Explainable AI (XAI) — SHAP Feature Explanations
                </h3>
                <p className="text-xs text-muted mt-1">
                  Shapley values display the mathematical impact of each resume attribute on your overall score.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Positive Impact Drivers */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-success flex items-center gap-1.5">
                    <Icon.Plus size={14} /> Positive Score Drivers
                  </h4>
                  <div className="space-y-2">
                    {predictions.explanations.topPositive?.map((item) => (
                      <div key={item.feature} className="flex items-center justify-between rounded-lg border border-line bg-success/5 px-3 py-2 text-sm">
                        <span className="font-medium text-ink">{formatFeatureName(item.feature)}</span>
                        <span className="font-mono text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded">
                          +{item.impact.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {(!predictions.explanations.topPositive || predictions.explanations.topPositive.length === 0) && (
                      <p className="text-xs text-faint">No major positive drivers identified yet.</p>
                    )}
                  </div>
                </div>

                {/* Negative Impact Drivers */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-danger flex items-center gap-1.5">
                    <span className="inline-block w-3.5 h-0.5 bg-danger rounded-full mr-0.5"></span>
                    Negative Score Drivers
                  </h4>
                  <div className="space-y-2">
                    {predictions.explanations.topNegative?.map((item) => (
                      <div key={item.feature} className="flex items-center justify-between rounded-lg border border-line bg-danger/5 px-3 py-2 text-sm">
                        <span className="font-medium text-ink">{formatFeatureName(item.feature)}</span>
                        <span className="font-mono text-xs font-semibold text-danger bg-danger/10 px-2 py-0.5 rounded">
                          {item.impact.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {(!predictions.explanations.topNegative || predictions.explanations.topNegative.length === 0) && (
                      <p className="text-xs text-faint">No major negative drivers identified.</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Actionable Recommendations */}
          {predictions.recommendations && predictions.recommendations.length > 0 && (
            <Card className="bg-gradient-to-r from-brand/5 via-brand/10 to-brand/5">
              <h3 className="font-display text-base font-semibold text-ink flex items-center gap-2">
                <Icon.Sparkles size={18} className="text-brand animate-pulse" />
                AI-Driven Career Improvement Roadmap
              </h3>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {predictions.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 rounded-xl border border-line bg-surface/80 p-3 text-sm text-ink shadow-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* Static / Base Profile Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Skills detected"
          value={pathScore.skills.length}
          hint="Profile plus latest resume"
          icon={Icon.Target}
        />
        <MetricCard
          label="Projects detected"
          value={pathScore.projectsCount}
          hint="From Resume Intelligence"
          icon={Icon.Route}
        />
        <MetricCard
          label="Profile signals"
          value={`${pathScore.profileCompletion.completed}/${pathScore.profileCompletion.total}`}
          hint="Education, role, skills, resume"
          icon={Icon.User}
        />
        <MetricCard
          label="Resume health"
          value={pathScore.resume ? `${pathScore.resume.healthScore}/100` : 'Missing'}
          hint={pathScore.resume?.originalName || 'Analyze a resume'}
          icon={Icon.FileText}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-base font-semibold text-ink">Profile completion</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {pathScore.profileCompletion.checks.map((check) => (
              <div
                key={check.label}
                className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/40 px-3 py-2"
              >
                <Icon.Check
                  size={15}
                  className={check.complete ? 'text-success' : 'text-faint'}
                />
                <span className={cn('text-sm', check.complete ? 'text-ink' : 'text-faint')}>
                  {check.label}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-base font-semibold text-ink">Skills powering the score</h2>
          {pathScore.skills.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {pathScore.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs text-muted"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Icon.Target />}
              title="No skills yet"
              description="Add skills in your profile or analyze a resume to generate a stronger score."
              action={
                <Button size="sm" variant="outline" onClick={onResume}>
                  Analyze resume
                </Button>
              }
              className="mt-4"
            />
          )}
        </Card>
      </div>
    </div>
  );
}

function FactorBar({ factor }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4 text-sm">
        <div>
          <p className="font-medium text-ink">{factor.label}</p>
          <p className="mt-0.5 text-xs text-faint">{factor.detail}</p>
        </div>
        <span className={cn('shrink-0 text-xs font-semibold', TEXT_COLORS[factor.status])}>
          {factor.score}/{factor.max}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn('h-full rounded-full transition-all', BAR_COLORS[factor.status])}
          style={{ width: `${factor.percent}%` }}
        />
      </div>
      {factor.tip && <p className="mt-1.5 text-xs text-faint">{factor.tip}</p>}
    </div>
  );
}

function MetricCard({ label, value, hint, icon: Ico }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-2 font-display text-2xl font-bold text-ink">{value}</p>
          {hint && <p className="mt-1 truncate text-xs text-faint">{hint}</p>}
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-brand-soft">
          <Ico size={17} />
        </span>
      </div>
    </Card>
  );
}

