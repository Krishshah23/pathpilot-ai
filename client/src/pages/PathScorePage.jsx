import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Icon } from '@/components/ui/icons';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/path-score');
      setPathScore(data.data.pathScore);
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
        <PathScoreContent pathScore={pathScore} onResume={() => navigate('/resume')} />
      )}
    </AppShell>
  );
}

function PathScoreContent({ pathScore, onResume }) {
  const readiness = pathScore.readiness || {};
  const readinessLabel = readiness.level || readiness.label || pathScore.label;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="flex flex-col items-center justify-center text-center">
          <p className="text-sm font-medium text-muted">Overall score</p>
          <ScoreGauge score={pathScore.score} size={220} label={readinessLabel} />
          <p className="mt-3 max-w-xs text-sm text-muted">{readiness.summary || pathScore.summary}</p>
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

