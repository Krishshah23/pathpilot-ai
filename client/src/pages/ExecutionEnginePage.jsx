/**
 * pages/ExecutionEnginePage.jsx — Skill Roadmap & Job Kanban Execution Engine Hub Page (/execution-engine)
 *
 * ARCHITECTURAL ROLE:
 * Action-oriented hub combining week-by-week learning roadmap execution with a 7-stage job application Kanban pipeline.
 *
 * FEATURES:
 * 1. Skill Roadmap Engine: Interactive week-by-week task checklist with hour tracking and progress bar calculations.
 *    Supports progress preservation across regenerations and Gemini AI gap week injection. Each task also surfaces
 *    2-3 curated learning resources (see config/learningResources.js) with a "Mark as Learned" toggle.
 * 2. Application Kanban Pipeline: 7-stage drag-and-drop opportunity cards (Wishlist -> Applied -> OA -> Interview -> HR -> Offer -> Rejected).
 * 3. Live Job Openings Feed: TheirStack API integration rendering role-specific active job openings with 1-click application tracking.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Icon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/Spinner';
import { Select } from '@/components/ui/Select';
import { OpportunityModal } from '@/components/opportunity/OpportunityModal';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { DREAM_ROLES } from '@/config/careerData';
import { getLearningResources } from '@/config/learningResources';

/* ── Kanban Stage config ── */
const STAGES = [
  { value: 'wishlist',  label: 'Wishlist',  color: '#A3A3A3' },
  { value: 'applied',   label: 'Applied',   color: '#1E40AF' },
  { value: 'oa',        label: 'OA',        color: '#92400E' },
  { value: 'interview', label: 'Interview', color: '#2B4C3F' },
  { value: 'hr',        label: 'HR',        color: '#525252' },
  { value: 'offer',     label: 'Offer',     color: '#2B4C3F' },
  { value: 'rejected',  label: 'Rejected',  color: '#B85A3C' },
];
const stageMap = Object.fromEntries(STAGES.map((s) => [s.value, s]));

export default function ExecutionEnginePage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  /* ── Roadmap state ── */
  const [plan, setPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [planRole, setPlanRole] = useState(user?.profile?.dreamRole || (DREAM_ROLES?.[0] ?? 'Full Stack Developer'));
  const [generating, setGenerating] = useState(false);

  // Always include both the saved plan role AND the user's profile role,
  // even if either is a custom value not in DREAM_ROLES
  const profileDreamRole = user?.profile?.dreamRole;
  const roleOptions = [...new Set([planRole, profileDreamRole, ...(DREAM_ROLES || [])].filter(Boolean))];

  /* ── Kanban state ── */
  const [opportunities, setOpportunities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingOpp, setLoadingOpp] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dragOverStage, setDragOverStage] = useState(null);

  /* ── Live Jobs state ── */
  const [liveJobs, setLiveJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  /* ── Load everything ── */
  useEffect(() => {
    loadPlan();
    loadOpportunities();
    loadLiveJobs();
  }, []);

  const loadPlan = async () => {
    try {
      const { data } = await api.get('/growth');
      if (data?.data?.plan) {
        setPlan(data.data.plan);
        if (data.data.plan.targetRole) setPlanRole(data.data.plan.targetRole);
      }
    } catch { /* no plan yet */ }
    finally { setLoadingPlan(false); }
  };

  /* ── Commit role change to profile + trigger Gemini re-analysis ── */
  const commitRoleIfChanged = async (role) => {
    if (role === user?.profile?.dreamRole) return; // nothing to do
    try {
      await api.patch('/profile', { dreamRole: role });
      await refreshUser();
      // Re-run Gemini resume analysis against the new role (fire-and-forget, don't block roadmap)
      api.post('/resume/reanalyze', { targetRole: role }).catch(() => {});
    } catch { /* silent */ }
  };

  const generatePlan = async () => {
    setGenerating(true);
    try {
      await commitRoleIfChanged(planRole);
      const { data } = await api.post('/growth/generate', { targetRole: planRole });
      if (data?.data?.plan) {
        setPlan(data.data.plan);
        toast.success('Roadmap ready!');
      }
    } catch (err) {
      toast.error(errorMessage(err, 'Could not build roadmap'));
    } finally { setGenerating(false); }
  };

  const toggleTask = async (key, next) => {
    setPlan((prev) => applyToggle(prev, key, next));
    try {
      const { data } = await api.patch(`/growth/tasks/${key}`, { completed: next });
      if (data?.data?.plan) setPlan(data.data.plan);
      if (next) {
        toast.info('Nice work! Completing skills like this can lift your Path Score — check your dashboard.');
      }
    } catch (err) {
      setPlan((prev) => applyToggle(prev, key, !next));
      toast.error(errorMessage(err, 'Could not update task'));
    }
  };

  const addCustomGoal = async ({ title, skill, estimatedHours }) => {
    try {
      const { data } = await api.post('/growth/tasks', { title, skill, estimatedHours });
      if (data?.data?.plan) setPlan(data.data.plan);
      toast.success('Added to your roadmap');
      return true;
    } catch (err) {
      toast.error(errorMessage(err, 'Could not add that goal'));
      return false;
    }
  };

  const deleteCustomGoal = async (key) => {
    const prevPlan = plan;
    setPlan((p) => removeTaskLocally(p, key));
    try {
      const { data } = await api.delete(`/growth/tasks/${key}`);
      if (data?.data?.plan) setPlan(data.data.plan);
    } catch (err) {
      setPlan(prevPlan);
      toast.error(errorMessage(err, 'Could not remove that goal'));
    }
  };

  const loadOpportunities = useCallback(async () => {
    try {
      const [oppRes, statsRes] = await Promise.all([
        api.get('/opportunities').catch(() => ({ data: { data: { opportunities: [] } } })),
        api.get('/opportunities/stats').catch(() => ({ data: { data: null } })),
      ]);
      setOpportunities(oppRes?.data?.data?.opportunities || []);
      setStats(statsRes?.data?.data || null);
    } catch {
      setOpportunities([]);
    } finally {
      setLoadingOpp(false);
    }
  }, []);

  const loadLiveJobs = async () => {
    setLoadingJobs(true);
    try {
      const role = user?.profile?.dreamRole || 'Full Stack Developer';
      const { data } = await api.get(`/live-jobs?role=${encodeURIComponent(role)}`);
      setLiveJobs(data?.data?.jobs || []);
    } catch {
      setLiveJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  };

  /* ── Opportunity CRUD ── */
  const handleCreate = async (form) => {
    setSaving(true);
    try {
      await api.post('/opportunities', form);
      setModalOpen(false);
      loadOpportunities();
    } catch (err) { toast.error(errorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (form) => {
    setSaving(true);
    try {
      await api.patch(`/opportunities/${editing._id}`, form);
      setModalOpen(false);
      setEditing(null);
      loadOpportunities();
    } catch (err) { toast.error(errorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/opportunities/${id}`);
      loadOpportunities();
    } catch (err) { toast.error(errorMessage(err)); }
  };

  const handleStageChange = async (id, newStage) => {
    try {
      await api.patch(`/opportunities/${id}`, { stage: newStage });
      loadOpportunities();
    } catch (err) { toast.error(errorMessage(err)); }
  };

  const grouped = useMemo(() => {
    const map = {};
    for (const s of STAGES) map[s.value] = [];
    if (Array.isArray(opportunities)) {
      for (const o of opportunities) {
        if (o && map[o.stage]) map[o.stage].push(o);
        else if (o) map.wishlist.push(o);
      }
    }
    return map;
  }, [opportunities]);


  return (
    <AppShell>
      <div className="space-y-10">

        {/* ── Page Header ─────────────────────────────────────────── */}
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink">Skill Roadmap & Opportunities</h1>
          <p className="mt-2 text-sm text-muted">Your week-by-week learning plan alongside your application pipeline.</p>
        </div>

        {/* ── Section 1: Skill Roadmap ─────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl font-bold text-ink">Skill Roadmap</h2>
            {plan && (
              <div className="flex items-center gap-3">
                <select
                  value={planRole}
                  onChange={(e) => setPlanRole(e.target.value)}
                  className="input h-9 py-0 text-sm w-48"
                >
                  {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <button
                  onClick={generatePlan}
                  disabled={generating}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-line text-sm font-medium text-muted hover:bg-surface-2 disabled:opacity-50 transition-colors"
                >
                  {generating ? <Spinner className="h-4 w-4" /> : <Icon.Sparkles size={14} />}
                  Rebuild
                </button>
              </div>
            )}
          </div>

          {loadingPlan ? (
            <div className="flex h-32 items-center justify-center">
              <Spinner className="h-6 w-6 text-[#2B4C3F]" />
            </div>
          ) : !plan ? (
            <GeneratePanel role={planRole} setRole={setPlanRole} roleOptions={roleOptions} generating={generating} onGenerate={generatePlan} />
          ) : (
            <RoadmapView plan={plan} role={planRole} setRole={setPlanRole} roleOptions={roleOptions} generating={generating} onGenerate={generatePlan} onToggle={toggleTask} onAddGoal={addCustomGoal} onDeleteGoal={deleteCustomGoal} />
          )}
        </section>

        {/* ── Section 2: Application Pipeline + Market Radar ─────── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl font-bold text-ink">Application Pipeline</h2>
            <button
              onClick={() => { setEditing(null); setModalOpen(true); }}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-soft transition-colors"
            >
              <Icon.Plus size={14} /> Add Application
            </button>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
            {/* Kanban Board — desktop/tablet only. Below lg, native HTML5 drag-and-drop
                doesn't work on touch and a 7-column horizontal-scroll board is hard to
                scan on a phone, so a stacked collapsible list (MobileKanbanStages) takes
                over instead. */}
            <div className="card p-4 overflow-hidden hidden lg:block">
              {loadingOpp ? (
                <div className="flex h-40 items-center justify-center">
                  <Spinner className="h-6 w-6 text-brand" />
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                  {STAGES.map((stage) => {
                    const cards = grouped[stage.value] || [];
                    const isOver = dragOverStage === stage.value;
                    return (
                      <div
                        key={stage.value}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnter={() => setDragOverStage(stage.value)}
                        onDragLeave={() => {
                          if (dragOverStage === stage.value) setDragOverStage(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOverStage(null);
                          const oppId = e.dataTransfer.getData('text/plain');
                          if (oppId) handleStageChange(oppId, stage.value);
                        }}
                        className={cn(
                          "flex w-52 shrink-0 flex-col rounded-xl border transition-all duration-200 bg-canvas",
                          isOver ? "border-[#2B4C3F] bg-[#F0F5F3] scale-[1.02] shadow-md" : "border-line"
                        )}
                      >
                        {/* Column header */}
                        <div className="flex items-center justify-between px-3 py-2.5 border-b border-line">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
                            <span className="text-xs font-semibold text-ink">{stage.label}</span>
                          </div>
                          <span className="text-[10px] font-bold text-faint bg-surface-2 px-1.5 py-0.5 rounded">
                            {cards.length}
                          </span>
                        </div>
                        {/* Cards */}
                        <div className="flex flex-col gap-2 p-2 overflow-y-auto" style={{ maxHeight: '50vh' }}>
                          {cards.length === 0 ? (
                            <div className="m-1 rounded-2xl border-2 border-dashed border-line py-6 px-3 flex flex-col items-center justify-center text-center gap-1 bg-canvas">
                              <Icon.Layers size={18} className="text-faint mb-0.5" />
                              <p className="text-xs font-medium text-ink">No applications yet</p>
                              <p className="text-[10px] text-muted">Track roles as you apply — they'll show up here.</p>
                            </div>
                          ) : (
                            cards.map((opp, oIdx) => (
                              <KanbanCard
                                key={opp?._id || opp?.id || oIdx}
                                opp={opp}
                                onEdit={(o) => { setEditing(o); setModalOpen(true); }}
                                onDelete={handleDelete}
                                onStageChange={handleStageChange}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}

                </div>
              )}
            </div>

            {/* Mobile Kanban — stacked, collapsible-by-stage list. Stage changes go
                through KanbanCard's built-in <select>, which already works on touch. */}
            <div className="lg:hidden">
              {loadingOpp ? (
                <div className="card flex h-40 items-center justify-center">
                  <Spinner className="h-6 w-6 text-brand" />
                </div>
              ) : (
                <MobileKanbanStages
                  grouped={grouped}
                  onEdit={(o) => { setEditing(o); setModalOpen(true); }}
                  onDelete={handleDelete}
                  onStageChange={handleStageChange}
                />
              )}
            </div>

            {/* Active Market Radar */}
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-line">
                <div>
                  <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
                    Active Market Radar
                  </h3>
                  <p className="text-[11px] text-faint mt-0.5">Live openings for your role</p>
                </div>
                <Link to="/live-jobs" className="text-xs font-semibold text-brand hover:underline shrink-0">
                  View all →
                </Link>
              </div>

              <div className="divide-y divide-line max-h-[480px] overflow-y-auto">
                {loadingJobs ? (
                  <div className="flex h-32 items-center justify-center">
                    <Spinner className="h-5 w-5 text-[#2B4C3F]" />
                  </div>
                ) : liveJobs.length > 0 ? (
                  liveJobs.map((job, jIdx) => (
                    <RadarJobRow key={job?.id || job?._id || jIdx} job={job} />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-6 m-4 rounded-2xl border-2 border-dashed border-line bg-canvas">
                    <Icon.Briefcase size={28} className="text-faint mb-2" />
                    <p className="text-sm font-medium text-ink">No live openings loaded</p>
                    <p className="text-xs text-muted mt-0.5">Explore active roles matching your target profile.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </section>
      </div>

      {/* Opportunity Modal */}
      <OpportunityModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSubmit={editing ? handleUpdate : handleCreate}
        initial={editing}
        loading={saving}
      />
    </AppShell>
  );
}

/* ── Generate Panel ── */
function GeneratePanel({ role, setRole, roleOptions, generating, onGenerate }) {
  return (
    <div className="card p-10 text-center max-w-xl mx-auto">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-muted mb-5">
        <Icon.BookOpen size={22} />
      </span>
      <h2 className="font-serif text-lg font-bold text-ink">Build your Skill Roadmap</h2>
      <p className="mt-2 text-sm text-muted">Turn your skill gap into a focused week-by-week learning plan.</p>
      <div className="mt-8 space-y-4 text-left max-w-sm mx-auto">
        <select value={role || ''} onChange={(e) => setRole(e.target.value)} className="input w-full text-sm">
          {(roleOptions || DREAM_ROLES)?.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="w-full h-11 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-soft disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {generating ? <><Spinner className="h-4 w-4" /> Generating…</> : <><Icon.Sparkles size={15} /> Generate Roadmap</>}
        </button>
      </div>
    </div>
  );
}

/* ── Roadmap View ── */
function RoadmapView({ plan, role, setRole, generating, onGenerate, onToggle, onAddGoal, onDeleteGoal }) {
  if (!plan || typeof plan !== 'object') return null;
  const pct = plan.progress?.percent || 0;
  const weeks = Array.isArray(plan.weeks) ? plan.weeks : [];
  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-ink">{plan.targetRole || role || 'Target Role'} Roadmap</p>
            <p className="text-xs text-faint mt-0.5">{plan.totalWeeks || weeks.length} weeks · {plan.totalHours || 0} hrs estimated</p>
          </div>
          <span className="font-serif text-3xl font-black text-brand">{pct}%</span>
        </div>
        <div className="h-2 rounded-full progress-ruler overflow-hidden">
          <div
            className="h-full rounded-full bg-brand transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-faint mt-2">
          {plan.progress?.completedTasks || 0} of {plan.totalTasks || 0} tasks complete
        </p>
      </div>

      {/* Week cards */}
      <div className="space-y-3">
        {weeks.map((week, idx) => (
          <WeekCard key={week?.week || idx} week={week} index={idx} onToggle={onToggle} onDeleteGoal={onDeleteGoal} />
        ))}
      </div>

      {/* Add a custom goal — keeps the roadmap extensible once curated gaps run out */}
      <AddCustomGoalCard onAdd={onAddGoal} />
    </div>
  );
}

/** Inline "add a custom goal" card — collapsed to a single button until clicked. */
function AddCustomGoalCard({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [hours, setHours] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const ok = await onAdd({ title: title.trim(), estimatedHours: hours ? Number(hours) : undefined });
    setSaving(false);
    if (ok) {
      setTitle('');
      setHours('');
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-dashed border-line text-sm font-semibold text-muted hover:border-brand/40 hover:text-brand hover:bg-brand/5 transition-colors"
      >
        <Icon.Plus size={15} /> Add a custom goal
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-faint">Add a custom goal</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Contribute to an open-source project"
          className="input flex-1 text-sm h-10"
        />
        <input
          type="number"
          min="1"
          max="80"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          placeholder="Hours"
          className="input w-full sm:w-24 text-sm h-10"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="h-9 px-4 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-soft disabled:opacity-50 transition-colors flex items-center gap-1.5"
        >
          {saving ? <Spinner className="h-3.5 w-3.5" /> : <Icon.Plus size={13} />} Add goal
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setTitle(''); setHours(''); }}
          className="h-9 px-3 rounded-lg text-xs font-semibold text-faint hover:text-ink transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function WeekCard({ week, index = 0, onToggle, onDeleteGoal }) {
  if (!week || typeof week !== 'object') return null;
  const [open, setOpen] = useState(week.week === 1 || index === 0);
  const tasks = Array.isArray(week.tasks) ? week.tasks : [];
  const isGapTargeted = tasks.some(t => typeof t === 'object' && t?.key?.startsWith('gap-task-'));
  const isRecommended = week.priority === 'core' || week.priority === 'high';

  const accentColorClass = isGapTargeted
    ? 'border-l-[#2B4C3F]'
    : isRecommended
    ? 'border-l-[#92400E]'
    : 'border-l-[#D0D0CA]';

  const safeIndex = typeof index === 'number' && !isNaN(index) ? index : 0;
  const staggerClass = `stagger-${(safeIndex % 5) + 1}`;
  const formattedIndex = String(week.week ?? safeIndex + 1).padStart(2, '0');

  const completedCount = tasks.filter(t => typeof t === 'object' ? Boolean(t?.completed) : false).length;

  return (
    <div className={cn("card overflow-hidden border-l-[4px] animate-fade-up", accentColorClass, staggerClass)}>
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-canvas transition-colors"
      >
        <span className="font-mono text-sm font-bold text-ink bg-surface-2 px-2.5 py-1.5 rounded-lg border border-line tracking-wider">
          {formattedIndex}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-ink">{week.title || week.topic || 'Untitled Week'}</p>
            {isGapTargeted && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-[#C8DDD6] text-[#2B4C3F] bg-[#F0F5F3]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2B4C3F]" />
                Gap-targeted
              </span>
            )}
          </div>
          <p className="text-xs text-faint mt-0.5">
            {isGapTargeted ? 'AI-personalized from your resume gaps · ' : ''}
            {week.focusHours ? `~${week.focusHours} hrs · ` : ''}
            {week.completedTasks ?? completedCount}/{tasks.length} tasks
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-20 h-1.5 rounded-full progress-ruler overflow-hidden">
            <div className="h-full rounded-full bg-[#2B4C3F]" style={{ width: `${week.percent || 0}%` }} />
          </div>
          <Icon.ChevronDown size={16} className={cn('text-faint transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {/* Tasks */}
      {open && (
        <div className="border-t border-line px-6 py-4 space-y-2 bg-canvas/50">
          {tasks.map((task, tIdx) => {
            const isObj = typeof task === 'object' && task !== null;
            const key = isObj ? (task.key || `task-${tIdx}`) : `task-${tIdx}`;
            const title = isObj ? (task.title || task.name || 'Untitled Task') : String(task);
            const hours = isObj ? (task.estimatedHours || task.hours || 1) : 1;
            const completed = isObj ? Boolean(task.completed) : false;
            const difficulty = isObj ? (task.difficulty || 'Intermediate') : 'Intermediate';
            const skillLabel = isObj ? (task.skill || title) : title;

            return (
              <TaskRow
                key={key}
                taskKey={key}
                title={title}
                hours={hours}
                completed={completed}
                difficulty={difficulty}
                skillLabel={skillLabel}
                onToggle={onToggle}
                onDeleteGoal={key.startsWith('custom-') ? onDeleteGoal : null}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Task Row (with Learning Resources disclosure) ── */
function TaskRow({ taskKey, title, hours, completed, difficulty, skillLabel, onToggle, onDeleteGoal }) {
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const resources = useMemo(() => getLearningResources(skillLabel), [skillLabel]);

  return (
    <div className={cn(
      'rounded-xl border transition-all duration-200',
      completed ? 'border-brand/30 bg-brand/10' : 'border-line bg-surface'
    )}>
      <div className="flex w-full items-center gap-3 p-3 text-left">
        <button
          onClick={() => onToggle(taskKey, !completed)}
          className="flex flex-1 items-center gap-3 text-left min-w-0"
          title={completed ? 'Mark as not learned' : 'Mark as learned'}
        >
          <span className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
            completed ? 'border-brand bg-brand text-white' : 'border-line-soft'
          )}>
            {completed && <Icon.Check size={11} />}
          </span>
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-medium truncate', completed ? 'text-faint line-through' : 'text-ink')}>
              {title}
            </p>
            <p className="text-xs text-faint">{hours} hrs</p>
          </div>
          <span className={cn(
            'shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border',
            difficulty === 'Beginner' ? 'border-brand/30 text-brand bg-brand/10' :
            difficulty === 'Advanced' ? 'border-danger/30 text-danger bg-danger/10' :
            'border-warning/30 text-warning bg-warning/10'
          )}>
            {difficulty}
          </span>
        </button>
        {onDeleteGoal && (
          <button
            onClick={() => onDeleteGoal(taskKey)}
            aria-label={`Remove custom goal: ${title}`}
            title="Remove custom goal"
            className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-faint hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <Icon.Trash size={13} />
          </button>
        )}
      </div>

      {resources.length > 0 && (
        <div className="border-t border-line/60 px-3 py-2">
          <button
            onClick={() => setResourcesOpen((o) => !o)}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-brand hover:underline"
          >
            <Icon.BookOpen size={11} /> Learning Resources
            <Icon.ChevronDown size={10} className={cn('transition-transform', resourcesOpen && 'rotate-180')} />
          </button>
          {resourcesOpen && (
            <div className="mt-2 space-y-1.5">
              {resources.map((r) => (
                <a
                  key={r.url}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 rounded-lg border border-line px-2.5 py-1.5 text-[11px] hover:bg-surface-2 transition-colors"
                >
                  <span className="min-w-0 truncate text-ink font-medium">{r.title}</span>
                  <span className="shrink-0 flex items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wide text-faint">{r.type}</span>
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-[9px] font-bold',
                      r.free ? 'bg-brand/10 text-brand' : 'bg-warning/10 text-warning'
                    )}>
                      {r.free ? 'Free' : 'Paid'}
                    </span>
                    <span className="text-faint">{r.time}</span>
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Mobile Kanban: stacked, collapsible-by-stage list (< lg breakpoint) ── */
function MobileKanbanStages({ grouped, onEdit, onDelete, onStageChange }) {
  // Default: expand every stage that already has cards, collapse empty ones —
  // avoids forcing the user to open 7 sections just to find the 1-2 that matter.
  const [collapsed, setCollapsed] = useState(() => {
    const initial = {};
    for (const stage of STAGES) {
      initial[stage.value] = (grouped[stage.value] || []).length === 0;
    }
    return initial;
  });
  const toggle = (key) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  return (
    <div className="space-y-2.5">
      {STAGES.map((stage) => {
        const cards = grouped[stage.value] || [];
        const isCollapsed = collapsed[stage.value];
        return (
          <div key={stage.value} className="card overflow-hidden !p-0">
            <button
              onClick={() => toggle(stage.value)}
              className="w-full flex items-center justify-between px-4 py-3"
              aria-expanded={!isCollapsed}
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                <span className="text-sm font-semibold text-ink">{stage.label}</span>
                <span className="text-[10px] font-bold text-faint bg-surface-2 px-1.5 py-0.5 rounded">
                  {cards.length}
                </span>
              </div>
              <Icon.ChevronDown size={16} className={cn('text-faint transition-transform', !isCollapsed && 'rotate-180')} />
            </button>
            {!isCollapsed && (
              <div className="flex flex-col gap-2 px-3 pb-3 border-t border-line pt-3">
                {cards.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-line py-5 px-3 flex flex-col items-center justify-center text-center gap-1 bg-canvas">
                    <Icon.Layers size={16} className="text-faint mb-0.5" />
                    <p className="text-xs font-medium text-ink">No applications yet</p>
                    <p className="text-[10px] text-muted">Track roles as you apply — they'll show up here.</p>
                  </div>
                ) : (
                  cards.map((opp, oIdx) => (
                    <KanbanCard
                      key={opp?._id || opp?.id || oIdx}
                      opp={opp}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onStageChange={onStageChange}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Kanban Card ── */
function KanbanCard({ opp, onEdit, onDelete, onStageChange }) {
  if (!opp || typeof opp !== 'object') return null;
  const stage = (opp.stage && stageMap[opp.stage]) || stageMap.wishlist;
  const company = opp.company || opp.companyName || 'Company';
  const role = opp.role || opp.jobTitle || 'Role';
  const oppId = opp._id || opp.id || '';

  return (
    <div
      draggable
      onDragStart={(e) => {
        if (oppId) e.dataTransfer.setData('text/plain', oppId);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className="group rounded-xl border border-line bg-surface p-3 hover:border-faint transition-colors cursor-grab active:cursor-grabbing hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-ink truncate">{company}</p>
          <p className="text-[11px] text-faint truncate mt-0.5">{role}</p>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => onEdit(opp)}
            aria-label={`Edit ${company} — ${role}`}
            className="rounded p-1 hover:bg-surface-2 text-faint hover:text-ink"
          >
            <Icon.Edit size={11} />
          </button>
          <button
            onClick={() => onDelete(oppId)}
            aria-label={`Delete ${company} — ${role}`}
            className="rounded p-1 hover:bg-danger/10 text-faint hover:text-danger"
          >
            <Icon.Trash size={11} />
          </button>
        </div>
      </div>
      <select
        value={opp.stage || 'wishlist'}
        onChange={(e) => onStageChange(oppId, e.target.value)}
        className="mt-2 w-full text-[10px] border border-line rounded-lg px-2 py-1 bg-canvas text-muted focus:outline-none cursor-pointer"
        onClick={(e) => e.stopPropagation()}
        onDragStart={(e) => e.preventDefault()}
      >
        {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
    </div>
  );
}

/* ── Radar Job Row ── */
function RadarJobRow({ job }) {
  if (!job || typeof job !== 'object') return null;
  const title = job.title || job.role || 'Job Opening';
  const company = job.company || 'Company';
  const location = job.location || 'Remote';
  const postedAgo = job.postedAgo ? ` · ${job.postedAgo}` : '';
  const url = job.applyUrl || job.url || job.link;

  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-canvas transition-colors">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink truncate">{title}</p>
        <p className="text-xs text-muted mt-0.5 truncate">{company}</p>
        <p className="text-[11px] text-faint mt-0.5">{location}{postedAgo}</p>
      </div>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-ink text-ink text-xs font-semibold hover:bg-ink hover:text-canvas transition-colors"
        >
          Apply <Icon.ArrowRight size={11} />
        </a>
      )}
    </div>
  );
}

/* ── Helpers ── */

function applyToggle(plan, key, completed) {
  if (!plan || !Array.isArray(plan.weeks)) return plan;
  let completedTasks = 0;
  const weeks = plan.weeks.map((w) => {
    const tasks = Array.isArray(w.tasks) ? w.tasks.map((t) => (typeof t === 'object' && t?.key === key ? { ...t, completed } : t)) : [];
    const done = tasks.filter((t) => typeof t === 'object' && Boolean(t.completed)).length;
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

/** Optimistically drops a task by key (used for custom-goal deletion) ahead of server confirmation. */
function removeTaskLocally(plan, key) {
  if (!plan || !Array.isArray(plan.weeks)) return plan;
  const weeks = plan.weeks
    .map((w) => ({ ...w, tasks: (w.tasks || []).filter((t) => t?.key !== key) }))
    .filter((w) => w.title !== 'Custom Goals' || w.tasks.length > 0);
  return { ...plan, weeks };
}
