/**
 * components/resumeBuilder/JdMatcher.jsx — Resume vs Job Description Matcher
 *
 * Collapsible panel: paste a job description, AI compares it against the
 * current draft's content, shows matched/missing keywords, and offers a
 * one-click "Auto-insert missing keywords" action that weaves them into the
 * summary (POST /resume-builder/ai/insert-keywords).
 */

import { useState } from 'react';
import { Icon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

// Kept in sync with the server-side minimum in resumeBuilder.controller.js's matchJobDescription.
const MIN_JD_LENGTH = 40;

export function JdMatcher({ onMatch, onInsertKeywords, applying }) {
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [matching, setMatching] = useState(false);
  const [result, setResult] = useState(null);

  const runMatch = async () => {
    if (jobDescription.trim().length < MIN_JD_LENGTH) return;
    setMatching(true);
    setResult(null);
    try {
      const data = await onMatch(jobDescription);
      setResult(data);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to match against job description'));
    } finally {
      setMatching(false);
    }
  };

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-ink border border-line">
            <Icon.Target size={15} />
          </span>
          <h3 className="text-sm font-bold text-ink">Match Against a Job Description</h3>
        </div>
        <Icon.ChevronDown size={15} className={cn('text-faint transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-line pt-4">
          <div>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here…"
              className="input w-full min-h-[120px] resize-none text-sm"
            />
            {jobDescription.trim().length > 0 && jobDescription.trim().length < MIN_JD_LENGTH && (
              <p className="text-[11px] text-faint mt-1.5">
                {MIN_JD_LENGTH - jobDescription.trim().length} more character{MIN_JD_LENGTH - jobDescription.trim().length === 1 ? '' : 's'} needed — paste the full job description, not just a summary.
              </p>
            )}
          </div>
          <button
            onClick={runMatch}
            disabled={matching || jobDescription.trim().length < MIN_JD_LENGTH}
            className="h-10 px-5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-soft disabled:opacity-40 transition-colors flex items-center gap-2"
          >
            {matching ? <Spinner className="h-4 w-4" /> : <Icon.Sparkles size={14} />} Compare
          </button>

          {result && (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-muted">
                Match: <span className="font-bold text-ink">{result.matchPercent}%</span> ({result.matchedKeywords?.length || 0} of {result.jdKeywords?.length || 0} keywords)
              </p>

              {result.matchedKeywords?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand mb-1.5">Matched</p>
                  <div className="flex flex-wrap gap-1">
                    {result.matchedKeywords.map((k) => (
                      <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-brand/10 text-brand">{k}</span>
                    ))}
                  </div>
                </div>
              )}

              {result.missingKeywords?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-danger mb-1.5">Missing</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {result.missingKeywords.map((k) => (
                      <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-danger/10 text-danger">{k}</span>
                    ))}
                  </div>
                  <button
                    onClick={() => onInsertKeywords(result.missingKeywords)}
                    disabled={applying}
                    className="h-9 px-4 rounded-lg border border-line text-xs font-semibold text-ink hover:bg-surface-2 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  >
                    {applying ? <Spinner className="h-3.5 w-3.5" /> : <Icon.Sparkles size={13} />} Auto-insert missing keywords
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
