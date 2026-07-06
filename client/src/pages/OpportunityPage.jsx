import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/icons';
import { OpportunityModal } from '@/components/opportunity/OpportunityModal';
import { ConfidenceTag } from '@/components/ui/ConfidenceTag';
import { useToast } from '@/context/ToastContext';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

/* ─── Stage metadata ─── */
const STAGES = [
  { value: 'wishlist', label: 'Wishlist', color: '#626b80', bg: 'bg-faint/10' },
  { value: 'applied', label: 'Applied', color: '#38bdf8', bg: 'bg-info/10' },
  { value: 'oa', label: 'OA', color: '#f59e0b', bg: 'bg-warning/10' },
  { value: 'interview', label: 'Interview', color: '#8b5cf6', bg: 'bg-violet/10' },
  { value: 'hr', label: 'HR', color: '#818cf8', bg: 'bg-brand-soft/10' },
  { value: 'offer', label: 'Offer', color: '#22c55e', bg: 'bg-success/10' },
  { value: 'rejected', label: 'Rejected', color: '#ef4444', bg: 'bg-danger/10' },
];

const stageMap = Object.fromEntries(STAGES.map((s) => [s.value, s]));

/**
 * Opportunity Tracker — Kanban board + list view for tracking job applications
 * through hiring stages. Students can add, edit, move, and delete opportunities.
 */
export default function OpportunityPage() {
  const toast = useToast();

  const [opportunities, setOpportunities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // View mode: 'board' or 'list'
  const [view, setView] = useState('board');

  // Filters
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('all');

  /* ─── Data fetching ─── */
  const fetchData = useCallback(async () => {
    try {
      const [oppRes, statsRes] = await Promise.all([
        api.get('/opportunities'),
        api.get('/opportunities/stats'),
      ]);
      setOpportunities(oppRes.data.data.opportunities);
      setStats(statsRes.data.data);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to load opportunities'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ─── CRUD handlers ─── */
  const handleCreate = async (form) => {
    setSaving(true);
    try {
      await api.post('/opportunities', form);
      toast.success('Opportunity added');
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (form) => {
    setSaving(true);
    try {
      await api.patch(`/opportunities/${editing._id}`, form);
      toast.success('Opportunity updated');
      setModalOpen(false);
      setEditing(null);
      fetchData();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/opportunities/${id}`);
      toast.info('Opportunity removed');
      fetchData();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleStageChange = async (id, newStage) => {
    try {
      await api.patch(`/opportunities/${id}`, { stage: newStage });
      fetchData();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const openEdit = (opp) => {
    setEditing(opp);
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  /* ─── Filtered data ─── */
  const filtered = useMemo(() => {
    let list = opportunities;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.company.toLowerCase().includes(q) ||
          o.role.toLowerCase().includes(q)
      );
    }
    if (filterStage !== 'all') {
      list = list.filter((o) => o.stage === filterStage);
    }
    return list;
  }, [opportunities, search, filterStage]);

  /* Group by stage for board view */
  const grouped = useMemo(() => {
    const map = {};
    for (const s of STAGES) map[s.value] = [];
    for (const o of filtered) {
      if (map[o.stage]) map[o.stage].push(o);
    }
    return map;
  }, [filtered]);

  return (
    <AppShell
      title="Opportunity Tracker"
      subtitle="Track your job applications across every stage"
      actions={
        <Button size="sm" onClick={openCreate}>
          <Icon.Plus size={16} /> Add
        </Button>
      }
    >
      <div className="space-y-6">
        {/* ─── Stats row ─── */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {STAGES.map((s) => (
              <Card key={s.value} className="!p-4 text-center">
                <p className="text-xs font-medium text-faint">{s.label}</p>
                <p
                  className="mt-1 font-display text-2xl font-bold"
                  style={{ color: s.color }}
                >
                  {stats.byStage[s.value] || 0}
                </p>
              </Card>
            ))}
          </div>
        )}

        {/* ─── Toolbar ─── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search company or role…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input !h-9 !w-56 !pl-9 !text-xs"
              />
              <Icon.Target size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            </div>

            {/* Stage filter */}
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="input !h-9 !w-auto !text-xs"
            >
              <option value="all">All stages</option>
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-2/40 p-1">
            <button
              onClick={() => setView('board')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition',
                view === 'board'
                  ? 'bg-brand/15 text-brand-soft shadow-sm'
                  : 'text-faint hover:text-muted'
              )}
            >
              <Icon.Columns size={14} /> Board
            </button>
            <button
              onClick={() => setView('list')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition',
                view === 'list'
                  ? 'bg-brand/15 text-brand-soft shadow-sm'
                  : 'text-faint hover:text-muted'
              )}
            >
              <Icon.ListIcon size={14} /> List
            </button>
          </div>
        </div>

        {/* ─── Content ─── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand" />
          </div>
        ) : opportunities.length === 0 ? (
          <EmptyState
            icon={<Icon.Briefcase />}
            title="No opportunities yet"
            description="Start tracking your job applications to stay organized throughout your career search."
            action={
              <Button size="sm" onClick={openCreate}>
                <Icon.Plus size={16} /> Add your first
              </Button>
            }
          />
        ) : view === 'board' ? (
          <BoardView
            grouped={grouped}
            onEdit={openEdit}
            onDelete={handleDelete}
            onStageChange={handleStageChange}
          />
        ) : (
          <ListView
            opportunities={filtered}
            onEdit={openEdit}
            onDelete={handleDelete}
            onStageChange={handleStageChange}
          />
        )}
      </div>

      {/* ─── Modal ─── */}
      <OpportunityModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={editing ? handleUpdate : handleCreate}
        initial={editing}
        loading={saving}
      />
    </AppShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BOARD VIEW — Kanban-style columns, one per stage.
   ═══════════════════════════════════════════════════════════════════════ */
function BoardView({ grouped, onEdit, onDelete, onStageChange }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      {STAGES.map((stage) => {
        const cards = grouped[stage.value] || [];
        return (
          <div
            key={stage.value}
            className="flex w-64 flex-shrink-0 flex-col rounded-2xl border border-line bg-surface/60"
          >
            {/* Column header */}
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="text-xs font-semibold text-ink">{stage.label}</span>
              </div>
              <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-faint">
                {cards.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3" style={{ maxHeight: '60vh' }}>
              {cards.length === 0 ? (
                <p className="py-6 text-center text-xs text-faint/60">No items</p>
              ) : (
                cards.map((opp) => (
                  <OpportunityCard
                    key={opp._id}
                    opp={opp}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onStageChange={onStageChange}
                    compact
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LIST VIEW — Table-like rows with inline actions.
   ═══════════════════════════════════════════════════════════════════════ */
function ListView({ opportunities, onEdit, onDelete, onStageChange }) {
  if (opportunities.length === 0) {
    return <p className="py-10 text-center text-sm text-faint">No matching opportunities.</p>;
  }

  return (
    <div className="space-y-3">
      {opportunities.map((opp) => (
        <OpportunityCard
          key={opp._id}
          opp={opp}
          onEdit={onEdit}
          onDelete={onDelete}
          onStageChange={onStageChange}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   OPPORTUNITY CARD — Single opportunity row/card used by both views.
   ═══════════════════════════════════════════════════════════════════════ */
function OpportunityCard({ opp, onEdit, onDelete, onStageChange, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const [showFitDetail, setShowFitDetail] = useState(false);
  const stage = stageMap[opp.stage] || stageMap.wishlist;
  const date = opp.updatedAt ? new Date(opp.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';

  return (
    <Card
      className={cn(
        'group transition-all hover:border-line hover:shadow-lg hover:shadow-brand/5',
        compact ? '!p-3' : '!p-4'
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Company icon */}
        <div
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
          style={{
            backgroundColor: `${stage.color}18`,
            color: stage.color,
          }}
        >
          {opp.company.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={cn('font-semibold text-ink truncate', compact ? 'text-sm' : 'text-base')}>
              {opp.company}
            </h3>
            {opp.url && (
              <a
                href={opp.url}
                target="_blank"
                rel="noreferrer"
                className="text-faint transition hover:text-brand-soft"
                title="Open link"
              >
                <Icon.ExternalLink size={13} />
              </a>
            )}
          </div>
          <p className="truncate text-xs text-muted">{opp.role}</p>
        </div>

        {/* Stage & Fit Badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          {opp.fitScore && opp.fitScore.score > 0 && (
            <span
              className={cn(
                "rounded-lg px-2 py-1 text-[11px] font-bold border",
                opp.fitScore.score >= 70
                  ? "bg-success/15 text-success border-success/35"
                  : opp.fitScore.score >= 45
                    ? "bg-warning/15 text-warning border-warning/35"
                    : "bg-danger/15 text-danger border-danger/35"
              )}
              title={`Combined fit score: ${opp.fitScore.score}% match`}
            >
              {opp.fitScore.score}% match
            </span>
          )}

          {!compact && (
            <span
              className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold"
              style={{
                backgroundColor: `${stage.color}18`,
                color: stage.color,
              }}
            >
              {stage.label}
            </span>
          )}
        </div>
      </div>

      {/* Metadata row */}
      {!compact && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-faint">
          {opp.location && (
            <span className="flex items-center gap-1">
              <Icon.MapPin size={12} /> {opp.location}
            </span>
          )}
          {opp.salary && (
            <span className="flex items-center gap-1">
              <Icon.DollarSign size={12} /> {opp.salary}
            </span>
          )}
          {date && (
            <span className="flex items-center gap-1">
              <Icon.Clock size={12} /> {date}
            </span>
          )}
        </div>
      )}

      {/* Expand/Diagnostics toggles */}
      {!compact && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {opp.timeline?.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-1 text-[11px] font-medium text-faint transition hover:text-muted"
            >
              <Icon.ChevronDown
                size={14}
                className={cn('transition-transform', expanded && 'rotate-180')}
              />
              Timeline ({opp.timeline.length} events)
            </button>
          )}

          {opp.fitScore && opp.fitScore.score > 0 && (
            <button
              type="button"
              onClick={() => setShowFitDetail((d) => !d)}
              className="flex items-center gap-1 text-[11px] font-medium text-faint transition hover:text-muted"
            >
              <Icon.ChevronDown
                size={14}
                className={cn('transition-transform', showFitDetail && 'rotate-180')}
              />
              AI Fit Diagnostics
            </button>
          )}
        </div>
      )}

      {/* Fit Diagnostics details */}
      {showFitDetail && opp.fitScore && !compact && (
        <div className="mt-3 rounded-xl border border-line bg-surface-2/40 p-3 space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <span className="text-[11px] font-bold text-ink uppercase tracking-wider">AI Fit Diagnostics</span>
            {opp.fitScore.confidence && (
              <ConfidenceTag confidence={opp.fitScore.confidence} size="sm" />
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-surface px-2 py-1.5 border border-line/45">
              <span className="text-[10px] text-faint block uppercase font-semibold">Role Fit</span>
              <span className="font-display text-sm font-bold text-ink">{opp.fitScore.roleFit}%</span>
            </div>
            <div className="rounded-lg bg-surface px-2 py-1.5 border border-line/45">
              <span className="text-[10px] text-faint block uppercase font-semibold">ATS Match</span>
              <span className="font-display text-sm font-bold text-ink">{opp.fitScore.atsPass}%</span>
            </div>
            <div className="rounded-lg bg-surface px-2 py-1.5 border border-line/45">
              <span className="text-[10px] text-faint block uppercase font-semibold">Interview</span>
              <span className="font-display text-sm font-bold text-ink">{opp.fitScore.interviewSuccess}%</span>
            </div>
          </div>
          <p className="text-[10px] text-faint leading-relaxed mt-1">
            This score predicts your preparation alignment for a <strong>{opp.role}</strong> position at <strong>{opp.company}</strong>.
          </p>
        </div>
      )}

      {/* Timeline */}
      {expanded && opp.timeline?.length > 0 && !compact && (
        <div className="mt-3 ml-4 border-l border-line pl-4 space-y-2">
          {opp.timeline.map((entry, i) => {
            const s = stageMap[entry.stage] || stageMap.wishlist;
            const entryDate = new Date(entry.date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            return (
              <div key={i} className="relative">
                <span
                  className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-surface"
                  style={{ backgroundColor: s.color }}
                />
                <p className="text-xs font-medium text-ink">{s.label}</p>
                <p className="text-[11px] text-faint">{entryDate}</p>
                {entry.note && <p className="text-[11px] text-muted">{entry.note}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className={cn(
        'flex items-center gap-1',
        compact ? 'mt-2' : 'mt-3 pt-3 border-t border-line'
      )}>
        {/* Quick stage move */}
        <select
          value={opp.stage}
          onChange={(e) => onStageChange(opp._id, e.target.value)}
          className="input !h-7 !w-auto !px-2 !text-[11px] !rounded-lg"
          title="Change stage"
        >
          {STAGES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <div className="flex-1" />

        <button
          onClick={() => onEdit(opp)}
          className="rounded-lg p-1.5 text-faint opacity-0 transition group-hover:opacity-100 hover:bg-surface-2 hover:text-ink"
          title="Edit"
        >
          <Icon.Edit size={14} />
        </button>
        <button
          onClick={() => onDelete(opp._id)}
          className="rounded-lg p-1.5 text-faint opacity-0 transition group-hover:opacity-100 hover:bg-danger/10 hover:text-danger"
          title="Delete"
        >
          <Icon.Trash size={14} />
        </button>
      </div>
    </Card>
  );
}
