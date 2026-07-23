import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/icons';
import { useToast } from '@/context/ToastContext';
import { api, errorMessage } from '@/lib/api';
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
      <div className="mb-8 pb-6 border-b border-[#EAEAE5]">
        <div className="flex items-center gap-3 mb-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EAEAE5] bg-[#F5F5F3]">
            <Icon.Shield size={16} className="text-[#525252]" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#A3A3A3]">Admin Access</span>
        </div>
        <h1 className="font-serif text-3xl font-black text-[#171717]">The Admin Ledger</h1>
        <p className="mt-1 text-sm text-[#A3A3A3]">Platform monitoring · User management · System metrics</p>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex items-center gap-1 rounded-xl border border-[#EAEAE5] bg-[#F5F5F3] p-1 w-fit">
        {TABS.map((t) => {
          const Ico = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition',
                tab === t.key
                  ? 'bg-[#171717] text-white shadow-sm'
                  : 'text-[#A3A3A3] hover:text-[#525252]'
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
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#EAEAE5] border-t-[#171717]" />
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
    { label: 'Total Users', value: stats.totalUsers, icon: Icon.Users, color: '#6366f1' },
    { label: 'Students', value: stats.totalStudents, icon: Icon.User, color: '#818cf8' },
    { label: 'Admins', value: stats.totalAdmins, icon: Icon.Shield, color: '#8b5cf6' },
    { label: 'New This Week', value: stats.recentSignups, icon: Icon.Sparkles, color: '#22c55e' },
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
              <div className="absolute top-0 right-0 h-20 w-20 rounded-full opacity-[0.07]"
                style={{ backgroundColor: s.color, transform: 'translate(30%, -30%)' }}
              />
              <div className="flex items-start gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
                  style={{ backgroundColor: `${s.color}18`, color: s.color }}
                >
                  <Ico size={18} />
                </span>
                <div>
                  <p className="text-xs font-medium text-[#A3A3A3]">{s.label}</p>
                  <p className="mt-1 font-serif text-2xl font-black text-[#171717] animate-count-up">{s.value}</p>
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
                        className="h-full rounded-full bg-gradient-to-r from-brand to-violet"
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
                wishlist: '#626b80', applied: '#38bdf8', oa: '#f59e0b',
                interview: '#8b5cf6', hr: '#818cf8', offer: '#22c55e', rejected: '#ef4444',
              };
              const labels = {
                wishlist: 'Wishlist', applied: 'Applied', oa: 'OA',
                interview: 'Interview', hr: 'HR', offer: 'Offer', rejected: 'Rejected',
              };
              return (
                <div key={stage} className="flex items-center gap-2 rounded-lg border border-line bg-surface-2/30 px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[stage] || '#626b80' }} />
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
            variant="ghost"
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
            variant="ghost"
            disabled={pagination.page >= pagination.pages}
            onClick={() => fetchUsers(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Table row ─── */
function UserRow({ user, onRoleChange, onDelete, loading }) {
  const u = user;
  const joinDate = new Date(u.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const skillCount = u.profile?.skills?.length || 0;

  return (
    <tr className="group border-b border-[#EAEAE5] transition-colors duration-150 hover:bg-[#F5F5F3]">
      {/* User info */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2B4C3F]/10 text-sm font-bold text-[#2B4C3F]">
            {u.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-[#171717]">{u.name}</p>
            <p className="text-xs text-[#A3A3A3]">{u.email}</p>
          </div>
        </div>
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
              ? 'border-[#2B4C3F]/30 bg-[#F0F5F3] text-[#2B4C3F]'
              : 'border-[#EAEAE5] bg-[#F5F5F3] text-[#525252]'
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
        <span className="text-xs text-[#525252]">{u.profile?.dreamRole || '—'}</span>
      </td>

      {/* Skills */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="text-xs text-[#525252]">{skillCount > 0 ? `${skillCount} skills` : '—'}</span>
      </td>

      {/* Joined */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="text-xs text-[#A3A3A3]">{joinDate}</span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <button
          onClick={() => onDelete(u._id, u.name)}
          disabled={loading}
          className="rounded-lg p-1.5 text-[#A3A3A3] opacity-0 transition group-hover:opacity-100 hover:bg-[#FDF5F3] hover:text-[#B85A3C] disabled:opacity-30"
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
        ? 'bg-[#F0F5F3] text-[#2B4C3F] border-[#C8DDD6]'
        : 'bg-[#F5F5F3] text-[#A3A3A3] border-[#EAEAE5]'
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-[#2B4C3F]' : 'bg-[#D0D0CA]')} />
      {label}
    </span>
  );
}

