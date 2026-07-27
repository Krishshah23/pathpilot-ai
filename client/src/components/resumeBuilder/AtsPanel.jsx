/**
 * components/resumeBuilder/AtsPanel.jsx — Persistent ATS Score Sidebar
 *
 * Shows the live (server-recomputed on every save) ATS heuristic score:
 * overall + keyword match / readability / bullet strength sub-scores, which
 * target keywords are present vs missing, and short actionable suggestions.
 * See resumeBuilderAts.service.js for how these are computed.
 */

import { Icon } from '@/components/ui/icons';

function scoreColor(score) {
  if (score >= 75) return '#2B4C3F';
  if (score >= 50) return '#92400E';
  return '#B85A3C';
}

function SubScore({ label, value }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="font-medium text-muted">{label}</span>
        <span className="font-mono text-ink">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden border border-line">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, backgroundColor: scoreColor(value) }} />
      </div>
    </div>
  );
}

export function AtsPanel({ atsScore }) {
  if (!atsScore) return null;
  const color = scoreColor(atsScore.overall);

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-faint">ATS Score</h3>
        <span className="text-lg font-bold font-mono" style={{ color }}>{atsScore.overall}<span className="text-xs text-faint">/100</span></span>
      </div>

      <div className="space-y-3">
        <SubScore label="Keyword Match" value={atsScore.keywordMatchPercent} />
        <SubScore label="Readability" value={atsScore.readability} />
        <SubScore label="Bullet Strength" value={atsScore.bulletStrength} />
      </div>

      {atsScore.missingKeywords?.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-danger mb-1.5">Missing Keywords</p>
          <div className="flex flex-wrap gap-1">
            {atsScore.missingKeywords.slice(0, 8).map((k) => (
              <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-danger/10 text-danger">{k}</span>
            ))}
          </div>
        </div>
      )}

      {atsScore.matchedKeywords?.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand mb-1.5">Matched Keywords</p>
          <div className="flex flex-wrap gap-1">
            {atsScore.matchedKeywords.slice(0, 8).map((k) => (
              <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-brand/10 text-brand">{k}</span>
            ))}
          </div>
        </div>
      )}

      {atsScore.suggestions?.length > 0 && (
        <div className="pt-3 border-t border-line space-y-1.5">
          {atsScore.suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px] text-muted leading-relaxed">
              <Icon.Info size={12} className="text-faint shrink-0 mt-0.5" /> {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
