/**
 * components/jobs/LiveJobsPanel.jsx — Shared Live Job Listings Explorer
 *
 * Extracted out of TalentAnalyzerPage.jsx's "Live Jobs" tab so the exact same
 * search/filter/save experience can also power the dedicated /live-jobs page
 * (see pages/LiveJobsPage.jsx) — Live Jobs previously only lived one click deep
 * inside Resume Strategy's 4th tab, which under-sold a feature that pulls real,
 * frequently-updated listings via TheirStack. Both call sites are purely
 * presentational/prop-driven; each owns its own data fetching.
 */

import { useState } from 'react';
import { Icon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/Spinner';
import { JobCard } from '@/components/jobs/JobCard';
import { useSavedJobs } from '@/lib/useSavedJobs';
import { matchJobToSkills } from '@/lib/jobMatch';
import { cn } from '@/lib/cn';

export function relativeTime(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function LiveJobsPanel({ jobs, loading, role, setRole, onRefresh, fetchedAt, skills }) {
  const [seniorityFilter, setSeniorityFilter] = useState('all');
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [searchRole, setSearchRole] = useState(role);
  const { isSaved, getStatus, toggleSave, setStatus, clearAll, count } = useSavedJobs();

  const seniorities = [...new Set(jobs.map((j) => j.seniority).filter(Boolean))];

  let visibleJobs = jobs;
  if (seniorityFilter !== 'all') visibleJobs = visibleJobs.filter((j) => j.seniority === seniorityFilter);
  if (showSavedOnly) visibleJobs = visibleJobs.filter((j) => isSaved(j.id));

  return (
    <div className="space-y-5">
      {/* Role bar + refresh */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 h-10 px-3 rounded-xl border border-line bg-surface-2">
          <Icon.Briefcase size={14} className="text-faint shrink-0" />
          <span className="text-sm font-medium text-ink truncate">{role}</span>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="h-10 px-4 rounded-xl border border-line text-sm font-medium text-muted hover:bg-surface-2 flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Icon.RotateCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Refreshed indicator + saved filter */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-faint">
          {fetchedAt ? `Last refreshed ${relativeTime(fetchedAt)}` : ' '}
        </span>
        {count > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSavedOnly((s) => !s)}
              className={cn(
                'inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors',
                showSavedOnly ? 'border-brand/40 bg-brand/10 text-brand' : 'border-line bg-surface-2 text-muted hover:text-ink'
              )}
            >
              <Icon.Bookmark size={11} /> {count} saved
            </button>
            {showSavedOnly && (
              <button onClick={clearAll} className="text-[10px] font-semibold text-faint hover:text-danger transition-colors">
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Seniority filter row */}
      {seniorities.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {['all', ...seniorities].map((s) => (
            <button
              key={s}
              onClick={() => setSeniorityFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors border',
                seniorityFilter === s ? 'bg-brand text-white border-brand' : 'border-line text-muted hover:bg-surface-2'
              )}
            >
              {s === 'all' ? 'All levels' : String(s).replace('_', ' ')}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner className="h-6 w-6 text-muted" />
        </div>
      ) : visibleJobs.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {visibleJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              matchTier={matchJobToSkills(skills, job)}
              saved={isSaved(job.id)}
              onToggleSave={toggleSave}
              status={getStatus(job.id)}
              onStatusChange={setStatus}
            />
          ))}
        </div>
      ) : jobs.length > 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Icon.Bookmark size={36} className="text-line mb-3" />
          <p className="text-sm text-faint">No saved jobs match this filter.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Icon.Briefcase size={36} className="text-line mb-3" />
          <p className="text-sm text-faint max-w-sm">
            No live listings found for {role} right now — check back soon or try a related role title.
          </p>
          <div className="flex items-center gap-2 mt-4 w-full max-w-xs">
            <input
              value={searchRole}
              onChange={(e) => setSearchRole(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && searchRole.trim()) setRole(searchRole.trim()); }}
              placeholder="Try a related role title…"
              className="input flex-1 text-sm h-9"
            />
            <button
              onClick={() => searchRole.trim() && setRole(searchRole.trim())}
              className="h-9 px-3 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-soft transition-colors shrink-0"
            >
              Search
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
