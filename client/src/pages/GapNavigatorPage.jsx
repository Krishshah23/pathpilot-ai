import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Icon } from '@/components/ui/icons';
import { api, errorMessage } from '@/lib/api';
import { DREAM_ROLES } from '@/config/careerData';
import { cn } from '@/lib/cn';

const PRIORITY_STYLES = {
  core: 'border-danger/40 bg-danger/10 text-danger',
  recommended: 'border-warning/40 bg-warning/10 text-warning',
  supporting: 'border-info/40 bg-info/10 text-info',
};

export default function GapNavigatorPage() {
  const { user } = useAuth();
  const toast = useToast();
  const initialRole = user?.profile?.dreamRole || DREAM_ROLES[0];

  const [targetRole, setTargetRole] = useState(initialRole);
  const [gap, setGap] = useState(null);
  const [sources, setSources] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [liveJobs, setLiveJobs] = useState(null);
  const [liveJobsError, setLiveJobsError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const analyze = async (role = targetRole, quiet = false) => {
    setAnalyzing(true);
    setError('');
    setLiveJobsError(null);
    try {
      const [gapRes, liveRes] = await Promise.allSettled([
        api.post('/gap/analyze', { targetRole: role }),
        api.get('/live-jobs', { params: { role } }),
      ]);

      if (gapRes.status === 'fulfilled') {
        setGap(gapRes.value.data.data.gap);
        setSources(gapRes.value.data.data.sources);
        setMarketData(gapRes.value.data.data.marketData || null);
        if (!quiet) toast.success('Gap analysis updated');
      } else {
        const message = errorMessage(gapRes.reason, 'Could not analyze skill gap');
        setError(message);
        if (!quiet) toast.error(message);
      }

      if (liveRes.status === 'fulfilled') {
        setLiveJobs(liveRes.value.data.data);
      } else {
        setLiveJobsError('Could not load live job openings right now.');
      }
    } finally {
      setAnalyzing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadInitialGap = async () => {
      setAnalyzing(true);
      setError('');
      setLiveJobsError(null);
      try {
        const [gapRes, liveRes] = await Promise.allSettled([
          api.post('/gap/analyze', { targetRole: initialRole }),
          api.get('/live-jobs', { params: { role: initialRole } }),
        ]);

        if (!mounted) return;

        if (gapRes.status === 'fulfilled') {
          setGap(gapRes.value.data.data.gap);
          setSources(gapRes.value.data.data.sources);
          setMarketData(gapRes.value.data.data.marketData || null);
        } else {
          setError(errorMessage(gapRes.reason, 'Could not analyze skill gap'));
        }

        if (liveRes.status === 'fulfilled') {
          setLiveJobs(liveRes.value.data.data);
        } else {
          setLiveJobsError('Could not load live job openings right now.');
        }
      } finally {
        if (mounted) {
          setAnalyzing(false);
          setLoading(false);
        }
      }
    };

    loadInitialGap();
    return () => {
      mounted = false;
    };
  }, [initialRole]);

  const submit = (event) => {
    event.preventDefault();
    analyze(targetRole);
  };

  const actions = (
    <Button size="sm" variant="outline" onClick={() => analyze(targetRole)} loading={analyzing}>
      <Icon.Sparkles size={16} /> Refresh
    </Button>
  );

  return (
    <AppShell title="Gap Navigator" subtitle="Compare your skills with a target role" actions={actions}>
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8 text-brand" />
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <Select
                label="Target role"
                value={targetRole}
                onChange={(event) => setTargetRole(event.target.value)}
                options={DREAM_ROLES}
              />
              <Button type="submit" loading={analyzing}>
                <Icon.Target size={16} /> Analyze gap
              </Button>
            </form>
          </Card>

          {error ? (
            <Card>
              <p className="text-sm text-danger">{error}</p>
            </Card>
          ) : gap ? (
            <GapContent
              gap={gap}
              sources={sources}
              marketData={marketData}
              liveJobs={liveJobs}
              liveJobsError={liveJobsError}
              targetRole={targetRole}
            />
          ) : (
            <EmptyState
              icon={<Icon.Target />}
              title="No gap analysis yet"
              description="Choose a target role to compare your current skills against role requirements."
            />
          )}
        </div>
      )}
    </AppShell>
  );
}

function GapContent({ gap, sources, marketData, liveJobs, liveJobsError, targetRole }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <p className="text-sm font-medium text-muted">Role fit</p>
          <div className="mt-4 flex items-end gap-2">
            <span className="font-display text-5xl font-extrabold text-ink">{gap.coverage}</span>
            <span className="pb-2 text-lg font-semibold text-muted">%</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-brand-soft" style={{ width: `${gap.coverage}%` }} />
          </div>
          <p className="mt-4 text-sm text-muted">{gap.summary}</p>
        </Card>

        <Card>
          <div className="grid gap-4 sm:grid-cols-3">
            <Signal label="Matched" value={gap.matchedCount} hint="Skills you already have" />
            <Signal label="Missing" value={gap.missingCount} hint="Skills to learn next" />
            <Signal label="Learning time" value={gap.estimatedLearningTime} hint="Rough effort estimate" />
          </div>
          <div className="mt-6 rounded-xl border border-line bg-surface-2/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-normal text-faint">Skill sources</p>
            <p className="mt-2 text-sm text-muted">
              {sources?.profileSkills || 0} profile skills and {sources?.resumeSkills || 0} resume skills
              were used for this comparison.
            </p>
          </div>
        </Card>
      </div>

      {/* Market data banner */}
      {marketData && (
        <MarketDataBanner marketData={marketData} />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <SkillPanel
          title="Matched skills"
          icon={Icon.Check}
          skills={gap.matchedSkills}
          empty="No role skills matched yet"
        />
        <MissingSkills skills={gap.missingSkills} marketAvailable={marketData?.available} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-base font-semibold text-ink">Current skills used</h2>
          {gap.currentSkills.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {gap.currentSkills.map((skill) => (
                <SkillBadge key={skill}>{skill}</SkillBadge>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Icon.Target />}
              title="No current skills found"
              description="Add skills in your profile or analyze a resume for a more useful comparison."
              className="mt-4"
            />
          )}
        </Card>

        <Card>
          <h2 className="font-display text-base font-semibold text-ink">Recommendations</h2>
          {/* Source label removed: was a small debug leak into UI */}
          <ul className="mt-4 space-y-3">
            {gap.recommendations.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-muted">
                <Icon.ChevronRight size={16} className="mt-0.5 shrink-0 text-brand-soft" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Live Job Openings */}
      <LiveJobOpenings jobs={liveJobs?.jobs} error={liveJobsError} role={targetRole} />
    </div>
  );
}

function MarketDataBanner({ marketData }) {
  if (!marketData?.available) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/30 px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
          <Icon.AlertTriangle size={16} />
        </span>
        <div>
          <p className="text-sm font-medium text-muted">Market data unavailable this week</p>
          <p className="text-xs text-faint">
            Skill priorities are based on static role requirements. Live job-market data will appear once available.
          </p>
        </div>
      </div>
    );
  }

  const lastUpdated = new Date(marketData.lastUpdated);
  const formattedDate = lastUpdated.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
        <Icon.Sparkles size={16} />
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium text-ink">
          Live market data active
        </p>
        <p className="text-xs text-faint">
          {marketData.skillsTracked} skills tracked from {marketData.sampleSize} job postings — last updated {formattedDate}
        </p>
      </div>
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
        <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
        Live
      </span>
    </div>
  );
}

function SkillPanel({ title, icon: Ico, skills, empty }) {
  return (
    <Card>
      <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
        <Ico size={18} className="text-success" /> {title}
      </h2>
      {skills.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {skills.map((item) => (
            <span
              key={item.skill}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs text-muted"
            >
              {item.skill}
              {item.marketBacked && item.marketFrequency != null && (
                <span className="rounded bg-success/10 px-1 py-0.5 text-[10px] font-semibold text-success">
                  {item.marketFrequency}%
                </span>
              )}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-faint">{empty}</p>
      )}
    </Card>
  );
}

function MissingSkills({ skills, marketAvailable }) {
  return (
    <Card>
      <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
        <Icon.Target size={18} className="text-warning" /> Missing skills
      </h2>
      {skills.length ? (
        <div className="mt-4 space-y-3">
          {skills.map((item) => (
            <div
              key={item.skill}
              className="flex flex-col gap-3 rounded-xl border border-line bg-surface-2/40 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-ink">{item.skill}</p>
                  {item.marketBacked && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                      <Icon.Sparkles size={9} />
                      {item.marketFrequency}% demand
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-faint">{item.estimatedHours} estimated hours</p>
              </div>
              <PriorityBadge priority={item.priority} />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-success">No missing skills for this role map.</p>
      )}
    </Card>
  );
}

function PriorityBadge({ priority }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-lg border px-2.5 py-1 text-xs font-semibold capitalize',
        PRIORITY_STYLES[priority] || 'border-line bg-surface-2 text-muted'
      )}
    >
      {priority}
    </span>
  );
}

function SkillBadge({ children }) {
  return (
    <span className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs text-muted">
      {children}
    </span>
  );
}

function Signal({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2/40 p-4">
      <p className="text-xs text-faint">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-ink">{value}</p>
      <p className="mt-1 text-xs text-faint">{hint}</p>
    </div>
  );
}

// ── Live Job Openings ────────────────────────────────────────────────

/**
 * Formats a salary pair into a human-readable string.
 * Assumes raw numbers are in the local currency (INR in this case).
 */
function formatSalary(min, max) {
  if (min == null && max == null) return 'Not disclosed';

  const fmt = (n) => {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}K`;
    return `₹${n}`;
  };

  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `From ${fmt(min)}`;
  return `Up to ${fmt(max)}`;
}

function LiveJobCard({ job }) {
  const salaryLabel = formatSalary(job.salaryMin, job.salaryMax);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-2/40 p-4 transition-colors hover:border-brand/30 hover:bg-surface-2/70">
      {/* Title + company */}
      <div>
        <p className="text-sm font-semibold text-ink leading-tight">{job.title}</p>
        <p className="mt-0.5 text-xs text-muted">{job.company}</p>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-2">
        {/* Location */}
        <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 border border-line px-2 py-0.5 text-[11px] text-faint">
          <Icon.MapPin size={10} />
          {job.location}
        </span>

        {/* Seniority */}
        {job.seniority && (
          <span className="inline-flex items-center gap-1 rounded-md bg-brand/10 border border-brand/20 px-2 py-0.5 text-[11px] font-medium text-brand capitalize">
            {job.seniority}
          </span>
        )}

        {/* Posted */}
        {job.postedAgo && (
          <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 border border-line px-2 py-0.5 text-[11px] text-faint">
            <Icon.Clock size={10} />
            {job.postedAgo}
          </span>
        )}
      </div>

      {/* Salary */}
      <p className="text-xs font-medium text-muted">
        <span className="text-faint">Salary: </span>
        {salaryLabel}
      </p>

      {/* Apply button */}
      {job.applyUrl ? (
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-xs font-semibold text-brand transition-colors hover:bg-brand/20"
        >
          Apply <Icon.ArrowRight size={12} />
        </a>
      ) : (
        <span className="mt-auto inline-flex w-full items-center justify-center rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-faint">
          No apply link available
        </span>
      )}
    </div>
  );
}

function LiveJobOpenings({ jobs, error, role }) {
  return (
    <Card>
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-base font-semibold text-ink">Live Job Openings</h2>
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success sm:self-auto">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          Live · aggregated from LinkedIn, Indeed &amp; more
        </span>
      </div>

      <p className="mt-1 text-xs text-faint">
        Real openings for <strong className="text-muted">{role}</strong> in India — posted in the last 30 days.
      </p>

      {/* Error state */}
      {error && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
          <Icon.AlertTriangle size={16} className="shrink-0 text-warning" />
          <p className="text-sm text-muted">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!error && (!jobs || jobs.length === 0) && (
        <div className="mt-4 rounded-xl border border-line bg-surface-2/30 px-4 py-8 text-center">
          <Icon.Briefcase size={28} className="mx-auto text-faint" />
          <p className="mt-3 text-sm font-medium text-muted">No live openings found for this role right now</p>
          <p className="mt-1 text-xs text-faint">Check back later — listings refresh every 6 hours.</p>
        </div>
      )}

      {/* Job cards grid */}
      {!error && jobs && jobs.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {jobs.map((job) => (
            <LiveJobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </Card>
  );
}
