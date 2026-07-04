import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/icons';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

/**
 * Command Center. Surfaces the student's latest profile, resume, Path Score,
 * and next actions without duplicating the deeper feature pages.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const p = user?.profile || {};
  const [pathScore, setPathScore] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/path-score');
        setPathScore(data.data.pathScore);
      } catch {
        /* Keep dashboard usable even if score calculation is unavailable. */
      }
    })();
  }, []);

  const readiness = pathScore?.readiness;
  const readinessLabel = readiness?.level || readiness?.label || 'Pending';

  const stats = [
    {
      label: 'Path Score',
      value: pathScore ? pathScore.score : '--',
      hint: pathScore ? pathScore.label : 'Complete profile signals',
    },
    {
      label: 'Career Readiness',
      value: readinessLabel,
      hint: readiness?.summary || 'Generated from your score signals',
    },
    { label: 'Resume Status', value: p.resumeUrl ? 'Uploaded' : 'Not uploaded' },
    { label: 'Skills Tracked', value: pathScore?.skills?.length ?? p.skills?.length ?? 0 },
  ];

  return (
    <AppShell title="Command Center" subtitle={`Welcome back, ${user?.name?.split(' ')[0]}`}>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <p className="text-sm text-muted">{s.label}</p>
              <p className="mt-2 truncate font-display text-2xl font-bold text-ink">{s.value}</p>
              {s.hint && <p className="mt-1 line-clamp-2 text-xs text-faint">{s.hint}</p>}
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-display text-base font-semibold text-ink">Your snapshot</h2>
                <p className="mt-1 text-sm text-muted">
                  Profile context used by Path Score and Gap Navigator.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/path-score')}>
                <Icon.Gauge size={16} /> View score
              </Button>
            </div>

            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                ['Dream Role', p.dreamRole || '--'],
                ['College', p.college || '--'],
                ['Branch', p.branch || '--'],
                ['Semester', p.semester ? `Semester ${p.semester}` : '--'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-line bg-surface-2/40 p-4">
                  <dt className="text-xs text-faint">{k}</dt>
                  <dd className="mt-1 font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>

            {pathScore?.skills?.length || p.skills?.length ? (
              <div className="mt-4">
                <p className="text-xs text-faint">Skills</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(pathScore?.skills || p.skills).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs text-muted"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>

          <Card>
            <h2 className="font-display text-base font-semibold text-ink">Quick actions</h2>
            <div className="mt-4 space-y-3">
              <ActionButton
                icon={Icon.FileText}
                label="Improve resume"
                onClick={() => navigate('/resume')}
              />
              <ActionButton
                icon={Icon.Target}
                label="Analyze role gap"
                onClick={() => navigate('/gap')}
              />
              <ActionButton
                icon={Icon.User}
                label="Update profile"
                onClick={() => navigate('/profile')}
              />
            </div>
            {!pathScore?.resume && (
              <EmptyState
                icon={<Icon.FileText />}
                title="Resume score missing"
                description="Analyze a text-based resume to improve score accuracy."
                className="mt-5 border-line bg-surface-2/20 py-6"
              />
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function ActionButton({ icon: Ico, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface-2/40 px-3 py-3 text-left text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-brand-soft">
        <Ico size={16} />
      </span>
      <span className="flex-1">{label}</span>
      <Icon.ChevronRight size={16} />
    </button>
  );
}
