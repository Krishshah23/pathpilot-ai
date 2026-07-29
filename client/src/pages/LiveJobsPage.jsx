/**
 * pages/LiveJobsPage.jsx — Dedicated Live Jobs Hub (/live-jobs)
 *
 * Live Jobs previously only existed one click deep as the 4th tab on Resume
 * Strategy (plus a 3-item preview widget on the dashboard) — real, frequently
 * refreshed listings from TheirStack deserved a top-level home of their own
 * instead of being the least-visible tab on a different feature's page.
 * Reuses the exact same LiveJobsPanel used by TalentAnalyzerPage's tab and
 * ExecutionEnginePage's Market Radar, so behavior (save, filter, match tier)
 * stays consistent everywhere Live Jobs shows up.
 */

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Icon } from '@/components/ui/icons';
import { LiveJobsPanel } from '@/components/jobs/LiveJobsPanel';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { DREAM_ROLES } from '@/config/careerData';

export default function LiveJobsPage() {
  const { user } = useAuth();
  const dreamRole = user?.profile?.dreamRole || (DREAM_ROLES?.[0] ?? 'Full Stack Developer');

  const [role, setRole] = useState(dreamRole);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState(null);

  const roleOptions = [...new Set([role, dreamRole, ...(DREAM_ROLES || [])].filter(Boolean))];

  const loadJobs = async (targetRole) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/live-jobs?role=${encodeURIComponent(targetRole)}`);
      setJobs(data.data.jobs || []);
      setFetchedAt(data.data.fetchedAt || new Date().toISOString());
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs(role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  return (
    <AppShell>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-50" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand">Live · Refreshed every 6 hours</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-ink flex items-center gap-2.5">
            <Icon.Briefcase size={26} className="text-brand" />
            Live Jobs
          </h1>
          <p className="mt-2 text-sm text-muted max-w-lg">
            Real, currently-open listings pulled straight from the market for your target role — save the ones you like, and track how well each matches your skills.
          </p>
        </div>

        <div className="w-full sm:w-64">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-faint mb-1.5">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="input w-full text-sm h-10">
            {roleOptions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      <LiveJobsPanel
        jobs={jobs}
        loading={loading}
        role={role}
        setRole={setRole}
        onRefresh={() => loadJobs(role)}
        fetchedAt={fetchedAt}
        skills={[...(user?.profile?.skills || [])]}
      />
    </AppShell>
  );
}
