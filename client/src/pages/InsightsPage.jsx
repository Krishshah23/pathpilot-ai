import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Icon } from '@/components/ui/icons';
import { SkillRadar } from '@/components/charts/SkillRadar';
import { TrendLine } from '@/components/charts/TrendLine';
import { FactorBars } from '@/components/charts/FactorBars';
import { api, errorMessage } from '@/lib/api';

export default function InsightsPage() {
  const navigate = useNavigate();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/insights');
        setInsights(data.data);
      } catch (err) {
        setError(errorMessage(err, 'Could not load insights'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AppShell title="Insights" subtitle="Analytics across your career readiness">
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8 text-brand" />
        </div>
      ) : error ? (
        <Card>
          <p className="text-sm text-danger">{error}</p>
        </Card>
      ) : (
        <InsightsContent insights={insights} navigate={navigate} />
      )}
    </AppShell>
  );
}

function InsightsContent({ insights, navigate }) {
  const { totals, pathScore, resumeTrend, growth, skillDistribution, readiness } = insights;
  const hasSkills = skillDistribution.some((d) => d.count > 0);

  return (
    <div className="space-y-6">
      {/* Summary metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Path Score" value={pathScore.score} hint={pathScore.label} icon={Icon.Gauge} />
        <Metric label="Skills tracked" value={totals.skills} hint="Profile + resume" icon={Icon.Target} />
        <Metric label="Projects" value={totals.projects} hint="From resume" icon={Icon.Route} />
        <Metric
          label="Resume health"
          value={totals.latestResumeHealth ?? '--'}
          hint={`${totals.resumeVersions} version${totals.resumeVersions === 1 ? '' : 's'}`}
          icon={Icon.FileText}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Path Score factor bars */}
        <Card>
          <CardHeader title="Path Score breakdown" subtitle={readiness?.summary || pathScore.label} />
          <div className="mt-4">
            <FactorBars data={pathScore.factors} />
          </div>
        </Card>

        {/* Skill distribution radar */}
        <Card>
          <CardHeader title="Skill distribution" subtitle="Where your skills are concentrated" />
          {hasSkills ? (
            <div className="mt-4">
              <SkillRadar data={skillDistribution} />
            </div>
          ) : (
            <EmptyState
              icon={<Icon.Target />}
              title="No skills yet"
              description="Add skills to your profile or analyze a resume to see your distribution."
              action={
                <Button size="sm" variant="outline" onClick={() => navigate('/profile')}>
                  Update profile
                </Button>
              }
              className="mt-4"
            />
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Resume health trend */}
        <Card>
          <CardHeader title="Resume health trend" subtitle="Score across your uploaded versions" />
          {resumeTrend.length >= 2 ? (
            <div className="mt-4">
              <TrendLine data={resumeTrend} xKey="index" yKey="score" />
            </div>
          ) : resumeTrend.length === 1 ? (
            <div className="mt-4 rounded-xl border border-line bg-surface-2/40 p-6 text-center">
              <p className="font-display text-3xl font-bold text-ink">{resumeTrend[0].score}</p>
              <p className="mt-1 text-sm text-muted">
                Analyze another resume version to see your trend over time.
              </p>
            </div>
          ) : (
            <EmptyState
              icon={<Icon.FileText />}
              title="No resume analyzed"
              description="Upload and analyze a resume to start tracking your health score."
              action={
                <Button size="sm" variant="outline" onClick={() => navigate('/resume')}>
                  Analyze resume
                </Button>
              }
              className="mt-4"
            />
          )}
        </Card>

        {/* Growth progress */}
        <Card>
          <CardHeader title="Growth Path progress" subtitle={growth.hasPlan ? growth.targetRole : 'No active roadmap'} />
          {growth.hasPlan ? (
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink">Overall completion</span>
                  <span className="font-semibold text-brand-soft">{growth.percent}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-brand-soft transition-all" style={{ width: `${growth.percent}%` }} />
                </div>
                <p className="mt-1 text-xs text-faint">
                  {growth.completedTasks}/{growth.totalTasks} tasks complete
                </p>
              </div>
              <div className="space-y-2">
                {growth.weeks.map((w) => (
                  <div key={w.week} className="flex items-center gap-3">
                    <span className="w-14 shrink-0 text-xs text-faint">Week {w.week}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-brand-soft" style={{ width: `${w.percent}%` }} />
                    </div>
                    <span className="w-9 shrink-0 text-right text-xs text-faint">{w.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Icon.Route />}
              title="No roadmap yet"
              description="Generate a Growth Path to track your weekly learning progress here."
              action={
                <Button size="sm" variant="outline" onClick={() => navigate('/growth')}>
                  Build roadmap
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

function CardHeader({ title, subtitle }) {
  return (
    <div>
      <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}

function Metric({ label, value, hint, icon: Ico }) {
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
