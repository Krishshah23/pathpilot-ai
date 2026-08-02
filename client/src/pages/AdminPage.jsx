/**
 * pages/AdminPage.jsx — Admin Dashboard & User Management Console Page (/admin)
 *
 * ARCHITECTURAL ROLE:
 * Admin management portal accessible exclusively to users with `role === 'admin'`:
 * 1. Platform Metrics: Total user accounts, student/admin breakdown, verified count, and active resumes.
 * 2. User Table & Search: Paginated, searchable user directory with role mutation and user deletion controls.
 * 3. Market & Cache Admin Controls: Admin-triggered Adzuna market refresh and TheirStack job cache invalidation.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/icons';
import { ScoreGauge } from '@/components/charts/ScoreGauge';
import { useToast } from '@/context/ToastContext';
import { api, errorMessage, getResumeFileUrl } from '@/lib/api';
import { cn } from '@/lib/cn';

/* ─── Tab definitions ─── */
const TABS = [
  { key: 'overview', label: 'Overview', icon: Icon.ChartBar },
  { key: 'users', label: 'Users', icon: Icon.Users },
];

/**
 * Admin Dashboard — platform overview and user management.
 * Only accessible to users with role === 'admin'.
 */
export default function AdminPage() {
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/admin/stats');
        setStats(data.data.stats);
      } catch (err) {
        toast.error(errorMessage(err, 'Failed to load admin stats'));
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  return (
    <AppShell>
      {/* Ledger Header */}
      <div className="mb-8 pb-6 border-b border-line">
        <div className="flex items-center gap-3 mb-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface-2">
            <Icon.Shield size={16} className="text-muted" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-faint">Admin Access</span>
        </div>
        <h1 className="font-serif text-3xl font-black text-ink">The Admin Ledger</h1>
        <p className="mt-1 text-sm text-faint">Platform monitoring · User management · System metrics</p>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex items-center gap-1 rounded-xl border border-line bg-surface-2 p-1 w-fit">
        {TABS.map((t) => {
          const Ico = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition',
                tab === t.key
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-faint hover:text-muted'
              )}
            >
              <Ico size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-ink" />
        </div>
      ) : tab === 'overview' ? (
        <OverviewTab stats={stats} />
      ) : (
        <UsersTab />
      )}
    </AppShell>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   OVERVIEW TAB
   ═══════════════════════════════════════════════════════════════════════ */
function OverviewTab({ stats }) {
  if (!stats) {
    return (
      <EmptyState
        icon={<Icon.Shield />}
        title="No data available"
        description="Stats will appear once users start using the platform."
      />
    );
  }

  const primaryStats = [
    { label: 'Total Users', value: stats.totalUsers, icon: Icon.Users, color: 'muted' },
    { label: 'Students', value: stats.totalStudents, icon: Icon.User, color: 'muted' },
    { label: 'Admins', value: stats.totalAdmins, icon: Icon.Shield, color: 'muted' },
    { label: 'New This Week', value: stats.recentSignups, icon: Icon.Sparkles, color: 'brand' },
  ];

  const moduleStats = [
    { label: 'Email Verified', value: stats.verifiedUsers, total: stats.totalUsers },
    { label: 'Onboarded', value: stats.onboardedUsers, total: stats.totalUsers },
    { label: 'Resumes Analyzed', value: stats.totalResumes },
    { label: 'Growth Plans', value: stats.totalGrowthPlans },
    { label: 'Opportunities', value: stats.totalOpportunities },
  ];

  return (
    <div className="space-y-6">
      {/* Primary stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {primaryStats.map((s, idx) => {
          const Ico = s.icon;
          return (
            <div key={s.label} className={cn("card card-hover p-5 relative overflow-hidden animate-fade-up", `stagger-${idx + 1}`)}>
              <div
                className={cn("absolute top-0 right-0 h-20 w-20 rounded-full opacity-[0.07]", s.color === 'brand' ? 'bg-brand' : 'bg-muted')}
                style={{ transform: 'translate(30%, -30%)' }}
              />
              <div className="flex items-start gap-3">
                <span
                  className={cn("flex h-10 w-10 items-center justify-center rounded-xl shrink-0", s.color === 'brand' ? 'bg-brand/10 text-brand' : 'bg-muted/10 text-muted')}
                >
                  <Ico size={18} />
                </span>
                <div>
                  <p className="text-xs font-medium text-faint">{s.label}</p>
                  <p className="mt-1 font-serif text-2xl font-black text-ink animate-count-up">{s.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>


      {/* Module engagement */}
      <Card>
        <h2 className="font-display text-base font-semibold text-ink mb-4">Platform Engagement</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {moduleStats.map((m) => {
            const pct = m.total ? Math.round((m.value / m.total) * 100) : null;
            return (
              <div key={m.label} className="rounded-xl border border-line bg-surface-2/40 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">{m.label}</span>
                  <span className="font-display text-lg font-bold text-ink">{m.value}</span>
                </div>
                {pct !== null && (
                  <>
                    <div className="mt-2 h-1.5 rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-faint">{pct}% of {m.total} users</p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Opportunity pipeline across platform */}
      {stats.opportunityStages && Object.keys(stats.opportunityStages).length > 0 && (
        <Card>
          <h2 className="font-display text-base font-semibold text-ink mb-4">
            Platform Opportunity Pipeline
          </h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.opportunityStages).map(([stage, count]) => {
              const colors = {
                wishlist: 'var(--color-faint)', applied: 'var(--color-muted)', oa: 'var(--color-warning)',
                interview: 'var(--color-brand)', hr: 'var(--color-muted)', offer: 'var(--color-brand)', rejected: 'var(--color-danger)',
              };
              const labels = {
                wishlist: 'Wishlist', applied: 'Applied', oa: 'OA',
                interview: 'Interview', hr: 'HR', offer: 'Offer', rejected: 'Rejected',
              };
              return (
                <div key={stage} className="flex items-center gap-2 rounded-lg border border-line bg-surface-2/30 px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[stage] || 'var(--color-faint)' }} />
                  <span className="text-xs text-muted">{labels[stage] || stage}</span>
                  <span className="text-sm font-bold text-ink">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   USERS TAB — Paginated, searchable user management table
   ═══════════════════════════════════════════════════════════════════════ */
function UsersTab() {
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // userId being acted on
  const [snapshotUserId, setSnapshotUserId] = useState(null); // user whose Student Snapshot drawer is open

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;

      const { data } = await api.get('/admin/users', { params });
      setUsers(data.data.users);
      setPagination(data.data.pagination);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, toast]);

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(userId);
    try {
      await api.patch(`/admin/users/${userId}`, { role: newRole });
      toast.success('Role updated');
      fetchUsers(pagination.page);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId, name) => {
    if (!window.confirm(`Delete user "${name}" and all their data? This cannot be undone.`)) return;

    setActionLoading(userId);
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.info('User deleted');
      fetchUsers(pagination.page);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input !h-9 !w-60 !pl-9 !text-xs"
            />
            <Icon.Target size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input !h-9 !w-auto !text-xs"
          >
            <option value="">All roles</option>
            <option value="student">Students</option>
            <option value="admin">Admins</option>
          </select>
        </div>
        <p className="text-xs text-faint">
          {pagination.total} user{pagination.total !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-brand" />
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={<Icon.Users />}
          title="No users found"
          description="Try adjusting your search or filter."
        />
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2/30">
                  <th className="px-4 py-3 font-medium text-faint">User</th>
                  <th className="px-4 py-3 font-medium text-faint">Role</th>
                  <th className="px-4 py-3 font-medium text-faint hidden sm:table-cell">Status</th>
                  <th className="px-4 py-3 font-medium text-faint hidden md:table-cell">Dream Role</th>
                  <th className="px-4 py-3 font-medium text-faint hidden lg:table-cell">Skills</th>
                  <th className="px-4 py-3 font-medium text-faint hidden lg:table-cell">Joined</th>
                  <th className="px-4 py-3 font-medium text-faint">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <UserRow
                    key={u._id}
                    user={u}
                    onRoleChange={handleRoleChange}
                    onDelete={handleDelete}
                    onViewSnapshot={() => setSnapshotUserId(u._id)}
                    loading={actionLoading === u._id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="tertiary"
            disabled={pagination.page <= 1}
            onClick={() => fetchUsers(pagination.page - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-faint">
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button
            size="sm"
            variant="tertiary"
            disabled={pagination.page >= pagination.pages}
            onClick={() => fetchUsers(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <UserDetailDrawer userId={snapshotUserId} onClose={() => setSnapshotUserId(null)} />
    </div>
  );
}

/* ─── Table row ─── */
function UserRow({ user, onRoleChange, onDelete, onViewSnapshot, loading }) {
  const u = user;
  const joinDate = new Date(u.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const skillCount = u.profile?.skills?.length || 0;

  return (
    <tr className="group border-b border-line transition-colors duration-150 hover:bg-surface-2">
      {/* User info — click to open the Student Snapshot drawer */}
      <td className="px-4 py-3">
        <button
          onClick={onViewSnapshot}
          className="flex items-center gap-3 text-left rounded-lg -mx-1 px-1 py-0.5 hover:bg-surface transition-colors"
          title="View student snapshot"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand shrink-0">
            {u.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-ink">{u.name}</p>
            <p className="text-xs text-faint">{u.email}</p>
          </div>
        </button>
      </td>

      {/* Role */}
      <td className="px-4 py-3">
        <select
          value={u.role}
          onChange={(e) => onRoleChange(u._id, e.target.value)}
          disabled={loading}
          className={cn(
            'rounded-lg border px-2 py-1 text-xs font-semibold transition',
            u.role === 'admin'
              ? 'border-brand/30 bg-brand/10 text-brand'
              : 'border-line bg-surface-2 text-muted'
          )}
        >
          <option value="student">Student</option>
          <option value="admin">Admin</option>
        </select>
      </td>

      {/* Status */}
      <td className="px-4 py-3 hidden sm:table-cell">
        <div className="flex flex-col gap-1.5 items-start">
          <StatusBadge active={u.isEmailVerified} label="Verified" />
          <StatusBadge active={u.onboardingCompleted} label="Onboarded" />
        </div>
      </td>

      {/* Dream role */}
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-xs text-muted">{u.profile?.dreamRole || '—'}</span>
      </td>

      {/* Skills */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="text-xs text-muted">{skillCount > 0 ? `${skillCount} skills` : '—'}</span>
      </td>

      {/* Joined */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="text-xs text-faint">{joinDate}</span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <button
          onClick={() => onDelete(u._id, u.name)}
          disabled={loading}
          className="rounded-lg p-1.5 text-faint opacity-0 transition group-hover:opacity-100 hover:bg-danger/10 hover:text-danger disabled:opacity-30"
          title="Delete user"
        >
          <Icon.Trash size={14} />
        </button>
      </td>
    </tr>
  );
}

function StatusBadge({ active, label }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border',
      active
        ? 'bg-brand/10 text-brand border-brand/30'
        : 'bg-surface-2 text-faint border-line'
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-brand' : 'bg-line')} />
      {label}
    </span>
  );
}

const ACTIVITY_DOT_COLOR = {
  success: 'bg-brand',
  warning: 'bg-warning',
  info: 'bg-muted',
};

/**
 * "Student Snapshot" — admin-only detail drawer for a single user.
 * Reuses the same engines the student's own Overview page runs (Path Score,
 * peer benchmarking) so an admin sees real context, not a bare field dump —
 * plus their latest resume (view/download via GridFS) and a recent
 * activity timeline. Backed by GET /api/admin/users/:id.
 */
function UserDetailDrawer({ userId, onClose }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    setData(null);
    setLoading(true);
    (async () => {
      try {
        const { data: res } = await api.get(`/admin/users/${userId}`);
        setData(res.data);
      } catch (err) {
        toast.error(errorMessage(err, 'Failed to load student snapshot'));
        onClose();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [userId, onClose]);

  if (!userId) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[6px] fix-panel-backdrop" onClick={onClose} />

      {/* Drawer */}
      <div ref={panelRef} className="relative w-full max-w-[480px] h-full bg-surface border-l border-line flex flex-col fix-panel-drawer">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-line bg-canvas">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand shrink-0">
              {data?.user?.name?.charAt(0).toUpperCase() || '…'}
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-ink leading-tight truncate">{data?.user?.name || 'Loading…'}</h3>
              <p className="text-[10px] text-faint mt-0.5 truncate">{data?.user?.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-2 text-faint hover:text-muted transition-all duration-200 shrink-0"
            aria-label="Close panel"
          >
            <Icon.X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-ink" />
            </div>
          ) : data ? (
            <div className="fix-panel-content space-y-6">
              {/* Path Score */}
              <div className="flex flex-col items-center text-center">
                <ScoreGauge score={data.pathScore.displayScore} label={data.pathScore.readiness?.label} size={140} />
                <p className="mt-3 text-xs text-muted max-w-[300px] leading-relaxed">{data.pathScore.readiness?.summary}</p>
              </div>

              {/* Peer percentile */}
              {data.peerBenchmark?.available && (
                <div className="rounded-xl border border-line bg-surface-2 p-4 text-center">
                  <p className="text-xs text-muted">
                    Beats <strong className="text-ink">{data.peerBenchmark.betterThanPercent}%</strong> of{' '}
                    {data.peerBenchmark.dreamRole} peers on PathPilot
                    {data.peerBenchmark.scope === 'platform' && ' (platform-wide — not enough same-role peers yet)'}
                  </p>
                </div>
              )}

              {/* Resume */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-faint mb-2">Resume</p>
                {data.resume ? (
                  <div className="rounded-xl border border-line p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{data.resume.originalName || 'Resume'}</p>
                      <p className="text-xs text-faint">
                        {data.resume.wordCount} words · Health {data.resume.healthScore}/100
                        {data.related.resumeCount > 1 && ` · ${data.related.resumeCount} versions`}
                      </p>
                    </div>
                    {data.resume.fileId && (
                      <div className="flex items-center gap-3 shrink-0">
                        <a
                          href={getResumeFileUrl(data.resume.fileId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink transition-colors"
                          title="View original file"
                        >
                          <Icon.ExternalLink size={13} /> View
                        </a>
                        <a
                          href={getResumeFileUrl(data.resume.fileId, { download: true })}
                          className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink transition-colors"
                          title="Download original file"
                        >
                          <Icon.Download size={13} /> Download
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-faint">No resume uploaded yet.</p>
                )}
              </div>

              {/* Growth plan + opportunities */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-line p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-faint">Growth Plan</p>
                  <p className="mt-1 text-sm font-semibold text-ink truncate">{data.related.growthPlan?.targetRole || '—'}</p>
                  <p className="text-xs text-faint">
                    {data.related.growthPlan ? `${data.related.growthPlan.totalTasks} tasks · ${data.related.growthPlan.totalHours}h` : 'None yet'}
                  </p>
                </div>
                <div className="rounded-xl border border-line p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-faint">Opportunities</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{data.related.opportunityCount}</p>
                  <p className="text-xs text-faint">in pipeline</p>
                </div>
              </div>

              {/* Recent activity */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-faint mb-3">Recent Activity</p>
                {data.recentActivity.length === 0 ? (
                  <p className="text-xs text-faint">No activity yet.</p>
                ) : (
                  <div className="space-y-3">
                    {data.recentActivity.map((n) => (
                      <div key={n._id} className="flex gap-3">
                        <span className={cn('mt-1.5 h-1.5 w-1.5 rounded-full shrink-0', ACTIVITY_DOT_COLOR[n.type] || 'bg-muted')} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-ink">{n.title}</p>
                          <p className="text-xs text-faint mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-faint mt-0.5">{new Date(n.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

