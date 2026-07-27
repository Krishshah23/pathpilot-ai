/**
 * services/resumeBuilderAts.service.js — Resume Builder ATS Score Heuristic
 *
 * WHY DETERMINISTIC, NOT AI:
 * The ATS panel needs to recompute on every keystroke-driven save (live match %,
 * readability, bullet strength). Calling Gemini on every edit would be slow and
 * burn API quota for something that doesn't need language understanding — just
 * keyword presence, sentence length, and action-verb/metric pattern matching.
 * This mirrors the existing resumeRedFlags.js heuristic-checks pattern.
 *
 * TARGET KEYWORDS SOURCE:
 * Reuses getMarketDataForRole() (jobMarket.service.js) — the same live market-demand
 * skill frequency data gap analysis already uses — rather than inventing a second,
 * disconnected notion of "what ATS looks for." Keeps the whole app's idea of
 * "in-demand keywords for this role" consistent in one place.
 */

import { getMarketDataForRole } from './jobMarket.service.js';

const ACTION_VERBS = [
  'built', 'led', 'designed', 'developed', 'implemented', 'architected', 'launched',
  'optimized', 'reduced', 'increased', 'improved', 'automated', 'created', 'shipped',
  'deployed', 'migrated', 'refactored', 'scaled', 'drove', 'managed', 'delivered',
  'engineered', 'streamlined', 'spearheaded', 'accelerated', 'established', 'integrated',
];
const ACTION_VERB_REGEX = new RegExp(`^(${ACTION_VERBS.join('|')})\\b`, 'i');
const METRIC_REGEX = /\d/;

/** Flattens every bullet across experience and projects into one array. */
function collectBullets(doc) {
  return [
    ...(doc.experience || []).flatMap((e) => e.bullets || []),
    ...(doc.projects || []).flatMap((p) => p.bullets || []),
  ].filter((b) => b?.trim());
}

/** Builds the full searchable text of the resume (summary + bullets + skills). */
function fullText(doc) {
  const bullets = collectBullets(doc);
  return [doc.summary || '', ...bullets, ...(doc.skills || [])].join(' ').toLowerCase();
}

function scoreKeywordMatch(doc, targetKeywords) {
  if (!targetKeywords.length) return { percent: 0, matched: [], missing: [] };
  const text = fullText(doc);
  const matched = [];
  const missing = [];
  for (const kw of targetKeywords) {
    if (text.includes(kw.toLowerCase())) matched.push(kw);
    else missing.push(kw);
  }
  return { percent: Math.round((matched.length / targetKeywords.length) * 100), matched, missing };
}

function scoreReadability(doc) {
  const bullets = collectBullets(doc);
  if (!bullets.length) return 0;
  const wordCounts = bullets.map((b) => b.trim().split(/\s+/).filter(Boolean).length);
  // Sweet spot: 8-25 words per bullet. Penalize bullets outside that range.
  const inRange = wordCounts.filter((c) => c >= 8 && c <= 25).length;
  return Math.round((inRange / bullets.length) * 100);
}

function scoreBulletStrength(doc) {
  const bullets = collectBullets(doc);
  if (!bullets.length) return 0;
  let points = 0;
  for (const b of bullets) {
    const trimmed = b.trim();
    if (ACTION_VERB_REGEX.test(trimmed)) points += 0.5;
    if (METRIC_REGEX.test(trimmed)) points += 0.5;
  }
  return Math.round((points / bullets.length) * 100);
}

function buildSuggestions({ keywordMatchPercent, readability, bulletStrength, missingKeywords, hasSummary, hasBullets }) {
  const suggestions = [];
  if (!hasSummary) suggestions.push('Add a professional summary to introduce your background.');
  if (!hasBullets) suggestions.push('Add experience or project bullets — an empty resume scores 0 on every ATS check.');
  if (keywordMatchPercent < 50 && missingKeywords.length) {
    suggestions.push(`Add in-demand keywords like ${missingKeywords.slice(0, 3).join(', ')} where genuinely relevant.`);
  }
  if (bulletStrength < 60) {
    suggestions.push('Start more bullets with a strong action verb (Built, Led, Optimized) and include a measurable result.');
  }
  if (readability < 60) {
    suggestions.push('Aim for 8-25 words per bullet — too short lacks detail, too long loses the reader.');
  }
  if (suggestions.length === 0) suggestions.push('Your resume is in strong shape — keep it updated as your experience grows.');
  return suggestions;
}

/**
 * Computes the full ATS score breakdown for a ResumeBuilder document.
 * @param {object} doc - ResumeBuilder document (or plain object with matching shape)
 * @param {string} dreamRole - Target role, used to source market keywords
 * @returns {Promise<object>} atsScore sub-object shape (see ResumeBuilder.js schema)
 */
export async function computeAtsScore(doc, dreamRole) {
  let targetKeywords = [];
  try {
    const marketData = await getMarketDataForRole(dreamRole || 'Software Engineer');
    if (marketData.available) {
      targetKeywords = marketData.skills.slice(0, 15).map((s) => s.skill);
    }
  } catch {
    targetKeywords = [];
  }

  const { percent: keywordMatchPercent, matched, missing } = scoreKeywordMatch(doc, targetKeywords);
  const readability = scoreReadability(doc);
  const bulletStrength = scoreBulletStrength(doc);
  const overall = Math.round(keywordMatchPercent * 0.4 + bulletStrength * 0.35 + readability * 0.25);

  const suggestions = buildSuggestions({
    keywordMatchPercent,
    readability,
    bulletStrength,
    missingKeywords: missing,
    hasSummary: Boolean(doc.summary?.trim()),
    hasBullets: collectBullets(doc).length > 0,
  });

  return {
    overall,
    keywordMatchPercent,
    readability,
    bulletStrength,
    matchedKeywords: matched,
    missingKeywords: missing,
    suggestions,
    computedAt: new Date(),
  };
}
