import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/context/AuthContext';

/**
 * Command Center. The full dashboard (Path Score, charts, activity feed,
 * recommendations) is built in later phases — for now it surfaces the profile
 * data captured during onboarding.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const p = user?.profile || {};

  const stats = [
    { label: 'Path Score', value: '—', hint: 'Unlocks in Phase 4' },
    { label: 'Career Readiness', value: '—', hint: 'Unlocks in Phase 4' },
    { label: 'Resume Status', value: p.resumeUrl ? 'Uploaded' : 'Not uploaded' },
    { label: 'Skills Tracked', value: p.skills?.length || 0 },
  ];

  return (
    <AppShell title="Command Center" subtitle={`Welcome back, ${user?.name?.split(' ')[0]}`}>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <p className="text-sm text-muted">{s.label}</p>
              <p className="mt-2 font-display text-2xl font-bold text-ink">{s.value}</p>
              {s.hint && <p className="mt-1 text-xs text-faint">{s.hint}</p>}
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <h2 className="font-display text-base font-semibold text-ink">Your snapshot</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                ['Dream Role', p.dreamRole || '—'],
                ['College', p.college || '—'],
                ['Branch', p.branch || '—'],
                ['Semester', p.semester ? `Semester ${p.semester}` : '—'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-line bg-surface-2/40 p-4">
                  <dt className="text-xs text-faint">{k}</dt>
                  <dd className="mt-1 font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            {p.skills?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-faint">Skills</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs text-muted"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="font-display text-base font-semibold text-ink">What's next</h2>
            <EmptyState
              icon="🚀"
              title="More modules incoming"
              description="Resume Intelligence, Path Score, Gap Navigator and Growth Path arrive in upcoming phases."
              className="mt-4 border-0 bg-transparent py-6"
            />
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
