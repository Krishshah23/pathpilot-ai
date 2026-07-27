/**
 * lib/jobMatch.js — Client-side Job/Skill Match Heuristic (Task 9C)
 *
 * No new API call: does a simple keyword overlap between the candidate's
 * known skills and the words in a job listing's title (the only free-text
 * field TheirStack reliably gives us here). Intentionally approximate —
 * this is a quick visual signal, not a scored ML prediction.
 */

/** Tiers, ordered strongest-first so callers can just compare the returned key. */
export const MATCH_TIERS = {
  strong: { label: 'Strong Match', dot: '🟢', color: 'text-brand' },
  partial: { label: 'Partial Match', dot: '🟡', color: 'text-warning' },
  explore: { label: 'Explore', dot: '⚪', color: 'text-faint' },
};

/** Normalizes a string into a set of lowercase alphanumeric tokens. */
function tokenize(str) {
  return new Set(
    (str || '')
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/i)
      .filter((t) => t.length > 1)
  );
}

/**
 * @param {string[]} skills - the candidate's known skills (profile + resume)
 * @param {{title?: string, seniority?: string}} job
 * @returns {'strong' | 'partial' | 'explore'}
 */
export function matchJobToSkills(skills, job) {
  if (!skills?.length || !job?.title) return 'explore';

  const jobTokens = tokenize(`${job.title} ${job.seniority || ''}`);
  const skillTokens = skills.flatMap((s) => [...tokenize(s)]);

  const hits = skillTokens.filter((t) => jobTokens.has(t)).length;
  const uniqueHits = new Set(skillTokens.filter((t) => jobTokens.has(t))).size;

  if (uniqueHits >= 2 || hits >= 3) return 'strong';
  if (uniqueHits >= 1) return 'partial';
  return 'explore';
}
