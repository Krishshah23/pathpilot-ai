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
import { JOB_STATUSES } from '@/lib/useSavedJobs';
import { cn } from '@/lib/cn';

/**
 * Formats job salary range into readable LPA (INR) or $ (USD/global) string.
 * Handles raw annual figures (e.g., 600,000 INR -> ₹6 LPA) as well as pre-scaled numbers.
 * @param {number|null} min - Minimum annual salary
 * @param {number|null} max - Maximum annual salary
 * @param {string|null} currency - Salary currency code ('INR', 'USD', etc.)
 * @returns {string|null} Formatted salary range string or null
 */
export function formatSalary(min, max, currency) {
  if (!min && !max) return null;
  if ((min != null && min <= 0) && (max != null && max <= 0)) return null;

  const isUSD = currency === 'USD' || currency === '$';

  const parseVal = (val) => {
    if (val == null || val <= 0) return null;
    // Raw annual figure >= 10,000 (e.g. 600,000 INR or 90,000 USD)
    if (val >= 10000) {
      if (isUSD) return `$${Math.round(val / 1000)}k`;
      const lakh = +(val / 100000).toFixed(1).replace(/\.0$/, '');
      return `₹${lakh}`;
    }
    // Figure already scaled to LPA (e.g. 6 to 18) or small $k
    if (isUSD) return `$${val}k`;
    return `₹${val}`;
  };

  const minFormatted = parseVal(min);
  const maxFormatted = parseVal(max);
  const suffix = isUSD ? ' / yr' : ' LPA';

  if (minFormatted && maxFormatted) {
    if (minFormatted === maxFormatted) return `${minFormatted}${suffix}`;

    // Strip duplicated currency prefix for clean range format (e.g. ₹6 and ₹8.4 -> ₹6–8.4 LPA)
    if (minFormatted.startsWith('₹') && maxFormatted.startsWith('₹')) {
      return `₹${minFormatted.slice(1)}–${maxFormatted.slice(1)}${suffix}`;
    }
    if (minFormatted.startsWith('$') && maxFormatted.startsWith('$')) {
      return `$${minFormatted.slice(1)}–${maxFormatted.slice(1)}${suffix}`;
    }
    return `${minFormatted}–${maxFormatted}${suffix}`;
  }

  if (minFormatted) return `${minFormatted}+${suffix}`;
  if (maxFormatted) return `Up to ${maxFormatted}${suffix}`;
  return null;
}

function MatchBadge({ tier }) {
  const t = MATCH_TIERS[tier] || MATCH_TIERS.explore;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold', t.color)}>
      {t.dot} {t.label}
    </span>
  );
}

export function JobCard({ job, matchTier, saved, onToggleSave, status, onStatusChange, variant = 'full' }) {
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

  const salaryDisplay = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide truncate">{job.company}</p>
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
        {salaryDisplay && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted bg-surface-2 border border-line px-2 py-1 rounded-full">
            {salaryDisplay.startsWith('$') ? (
              <Icon.DollarSign size={10} />
            ) : (
              <span className="font-bold text-[10px] leading-none">₹</span>
            )}
            {salaryDisplay.replace(/^[₹$]/, '')}
          </span>
        )}
      </div>

      {saved && onStatusChange && (
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-faint shrink-0">Status</span>
          <select
            value={status || 'wishlist'}
            onChange={(e) => onStatusChange(job.id, e.target.value)}
            className="flex-1 text-xs border border-line rounded-lg px-2 py-1 bg-surface-2 text-ink focus:outline-none cursor-pointer"
          >
            {JOB_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      )}

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
            className="bg-ink text-white hover:bg-ink/85 transition-colors inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold"
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
