/**
 * components/jobs/JobCard.jsx — Shared Live Job Listing Card (Task 9)
 *
 * Two variants sharing one source of truth so a job saved/matched in one
 * place is consistent everywhere:
 *   - "full"    — TalentAnalyzerPage's Live Jobs tab (9A)
 *   - "compact" — the Overview dashboard widget preview (9B)
 *
 * Match scoring (9C) and saved-state (9D) are computed by the caller
 * (useSavedJobs / matchJobToSkills) and passed in as props — this component
 * is purely presentational.
 */

import { Icon } from '@/components/ui/icons';
import { MATCH_TIERS } from '@/lib/jobMatch';
import { cn } from '@/lib/cn';

function MatchBadge({ tier }) {
  const t = MATCH_TIERS[tier] || MATCH_TIERS.explore;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold', t.color)}>
      {t.dot} {t.label}
    </span>
  );
}

export function JobCard({ job, matchTier, saved, onToggleSave, variant = 'full' }) {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-ink truncate">{job.title}</p>
          <p className="text-[11px] text-faint truncate">{job.company} · {job.location}{job.postedAgo ? ` · ${job.postedAgo}` : ''}</p>
        </div>
        <MatchBadge tier={matchTier} />
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-brand uppercase tracking-wide truncate">{job.company}</p>
          <h4 className="text-base font-bold text-ink mt-0.5 leading-snug">{job.title}</h4>
        </div>
        <button
          onClick={() => onToggleSave(job)}
          title={saved ? 'Remove from saved' : 'Save job'}
          aria-label={saved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
          aria-pressed={saved}
          className={cn(
            'shrink-0 flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
            saved ? 'border-brand/40 bg-brand/10 text-brand' : 'border-line text-faint hover:text-ink hover:bg-surface-2'
          )}
        >
          <Icon.Bookmark size={14} className={saved ? 'fill-current' : ''} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        {job.location && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted bg-surface-2 border border-line px-2 py-1 rounded-full">
            <Icon.MapPin size={10} /> {job.location}
          </span>
        )}
        {job.seniority && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-faint bg-surface-2 border border-line px-2 py-1 rounded-full">
            {String(job.seniority).replace('_', ' ')}
          </span>
        )}
        {job.salaryMin && job.salaryMax && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand bg-brand/10 border border-brand/20 px-2 py-1 rounded-full">
            <Icon.DollarSign size={10} /> {job.salaryMin}–{job.salaryMax} LPA
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-line">
        <div className="flex flex-col gap-1">
          <MatchBadge tier={matchTier} />
          {job.postedAgo && <span className="text-[10px] text-faint">{job.postedAgo}</span>}
        </div>
        {job.applyUrl ? (
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gradient inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold"
          >
            Apply Now <Icon.ArrowRight size={12} />
          </a>
        ) : (
          <span className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold text-faint bg-surface-2 border border-line cursor-not-allowed">
            No direct link
          </span>
        )}
      </div>
    </div>
  );
}
