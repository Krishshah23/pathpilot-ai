import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Icon } from '@/components/ui/icons';
import { ScoreGauge } from '@/components/charts/ScoreGauge';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api, errorMessage } from '@/lib/api';
import { DREAM_ROLES } from '@/config/careerData';
import { cn } from '@/lib/cn';

const DIFFICULTY_STYLES = {
  Beginner: 'border-success/40 bg-success/10 text-success',
  Intermediate: 'border-warning/40 bg-warning/10 text-warning',
  Advanced: 'border-danger/40 bg-danger/10 text-danger',
};

export default function GrowthPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(user?.profile?.dreamRole || DREAM_ROLES[0]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/growth');
        setPlan(data.data.plan);
        if (data.data.plan?.targetRole) setRole(data.data.plan.targetRole);
      } catch {
        /* no plan yet */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const generate = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post('/growth/generate', { targetRole: role });
      setPlan(data.data.plan);
      toast.success(data.message || 'Roadmap ready');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not build roadmap'));
    } finally {
      setGenerating(false);
    }
  };

  const toggleTask = async (key, next) => {
    // Optimistic update
    setPlan((prev) => applyToggle(prev, key, next));
    try {
      const { data } = await api.patch(`/growth/tasks/${key}`, { completed: next });
      setPlan(data.data.plan);
    } catch (err) {
      setPlan((prev) => applyToggle(prev, key, !next)); // revert
      toast.error(errorMessage(err, 'Could not update task'));
    }
  };

  const actions = plan && (
    <Button size="sm" variant="outline" onClick={generate} loading={generating}>
      <Icon.Sparkles size={16} /> Rebuild
    </Button>
  );

  return (
    <AppShell title="Growth Path" subtitle="Your personalized week-by-week roadmap" actions={actions}>
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8 text-brand" />
        </div>
      ) : !plan ? (
        <GeneratePanel role={role} setRole={setRole} generating={generating} onGenerate={generate} />
      ) : (
        <PlanView
          plan={plan}
          role={role}
          setRole={setRole}
          generating={generating}
          onGenerate={generate}
          onToggle={toggleTask}
        />
      )}
    </AppShell>
  );
}

function applyToggle(plan, key, completed) {
  if (!plan) return plan;
  let completedTasks = 0;
  const weeks = plan.weeks.map((w) => {
    const tasks = w.tasks.map((t) => (t.key === key ? { ...t, completed } : t));
    const done = tasks.filter((t) => t.completed).length;
    completedTasks += done;
    return { ...w, tasks, completedTasks: done, percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
  });
  return {
    ...plan,
    weeks,
    progress: {
      ...plan.progress,
      completedTasks,
      percent: plan.totalTasks ? Math.round((completedTasks / plan.totalTasks) * 100) : 0,
    },
  };
}

function GeneratePanel({ role, setRole, generating, onGenerate }) {
  return (
    <Card className="mx-auto max-w-xl text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-brand-soft">
        <Icon.Route size={22} />
      </div>
      <h2 className="font-display text-lg font-bold text-ink">Build your Growth Path</h2>
      <p className="mt-1 text-sm text-muted">
        We'll turn your skill gap into a focused, week-by-week learning plan for your target role.
      </p>
      <div className="mx-auto mt-6 max-w-sm space-y-4 text-left">
        <Select label="Target role" value={role} onChange={(e) => setRole(e.target.value)} options={DREAM_ROLES} />
        <Button className="w-full" onClick={onGenerate} loading={generating}>
          <Icon.Sparkles size={16} /> Generate roadmap
        </Button>
      </div>
    </Card>
  );
}

function PlanView({ plan, role, setRole, generating, onGenerate, onToggle }) {
  const pct = plan.progress?.percent || 0;
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="flex flex-col items-center justify-center text-center">
          <p className="text-sm font-medium text-muted">Overall progress</p>
          <ScoreGauge score={pct} size={190} label={`${pct}% done`} />
          <p className="mt-2 text-xs text-faint">
            {plan.progress?.completedTasks || 0}/{plan.totalTasks} tasks ·{' '}
            {plan.progress?.completedHours || 0}/{plan.totalHours} hrs
          </p>
        </Card>

        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-ink">
                Roadmap · {plan.targetRole}
              </h2>
              <p className="mt-1 text-sm text-muted">{plan.summary}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Stat label="Weeks" value={plan.totalWeeks} />
            <Stat label="Skills to learn" value={plan.totalTasks} />
            <Stat label="Est. effort" value={`${plan.totalHours} hrs`} />
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-line bg-surface-2/40 p-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Select
                label="Rebuild for a different role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                options={DREAM_ROLES}
              />
            </div>
            <Button variant="outline" onClick={onGenerate} loading={generating}>
              Rebuild
            </Button>
          </div>

          {plan.strengths?.length > 0 && (
            <div className="mt-5">
              <p className="text-xs text-faint">Skills you already have</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {plan.strengths.map((s) => (
                  <span
                    key={s}
                    className="rounded-lg border border-success/30 bg-success/10 px-2.5 py-1 text-xs text-success"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        {plan.weeks.map((week) => (
          <WeekCard key={week.week} week={week} onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
}

function WeekCard({ week, onToggle }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl btn-brand text-sm font-bold text-white">
            {week.week}
          </span>
          <div>
            <h3 className="font-display text-sm font-semibold text-ink">{week.title}</h3>
            <p className="text-xs text-faint">~{week.focusHours} hrs this week</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-muted">
          {week.completedTasks}/{week.totalTasks ?? week.tasks.length} done
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-brand-soft transition-all" style={{ width: `${week.percent || 0}%` }} />
      </div>

      <ul className="mt-4 space-y-2">
        {week.tasks.map((task) => (
          <li key={task.key}>
            <button
              onClick={() => onToggle(task.key, !task.completed)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition',
                task.completed
                  ? 'border-success/30 bg-success/5'
                  : 'border-line bg-surface-2/40 hover:bg-surface-2'
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition',
                  task.completed ? 'border-success bg-success text-white' : 'border-line text-transparent'
                )}
              >
                <Icon.Check size={13} />
              </span>
              <div className="flex-1">
                <p className={cn('text-sm font-medium', task.completed ? 'text-muted line-through' : 'text-ink')}>
                  {task.title}
                </p>
                <p className="text-xs text-faint">{task.estimatedHours} hrs</p>
              </div>
              <span
                className={cn(
                  'rounded-lg border px-2 py-0.5 text-[11px] font-semibold',
                  DIFFICULTY_STYLES[task.difficulty] || 'border-line text-muted'
                )}
              >
                {task.difficulty}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2/40 p-4">
      <p className="text-xs text-faint">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-ink">{value}</p>
    </div>
  );
}
