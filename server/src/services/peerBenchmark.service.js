/**
 * services/peerBenchmark.service.js — Anonymous Peer Score Comparison
 *
 * WHAT THIS COMPUTES:
 * Given a user's dream role, aggregates the CACHED Path Scores (`user.pathScoreCache`,
 * see pathScore.service.js) of every other student targeting the same role, then
 * derives:
 *   - Percentile rank ("you beat X% of peers" / "top X%")
 *   - A score-range histogram (0-20, 21-40, ..., 81-100) — never individual scores
 *   - Per-factor comparison (your Resume Quality vs peer average, etc.)
 *   - A "N points from the top 10%" motivational nudge
 *
 * WHY THE CACHE (NOT LIVE buildPathScore):
 * Recomputing buildPathScore() for every peer on every dashboard load doesn't scale.
 * pathScoreCache is kept warm by resume analysis, profile updates, onboarding, and an
 * opportunistic refresh on GET /api/path-score (see pathScore.controller.js) — so it's
 * a few minutes stale at worst, which is fine for an aggregate comparison.
 *
 * PRIVACY:
 * Only aggregate statistics are ever returned — no peer names, emails, or IDs.
 * A MIN_PEER_SAMPLE guard hides the feature entirely for roles with too few students,
 * since a percentile among 1-2 peers is both statistically meaningless and close to
 * identifying the other student.
 *
 * CACHING:
 * The peer aggregate (everything except the requesting user's own position in it) is
 * identical for every student targeting the same role, so it's cached in-memory per
 * role for a short TTL — mirrors the pattern in liveJobs.service.js.
 */

import { User } from '../models/User.js';

const MIN_PEER_SAMPLE = 5;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const BUCKETS = [
  { key: '0-20', min: 0, max: 20 },
  { key: '21-40', min: 21, max: 40 },
  { key: '41-60', min: 41, max: 60 },
  { key: '61-80', min: 61, max: 80 },
  { key: '81-100', min: 81, max: 100 },
];

/** @type {Map<string, { fetchedAt: number, peers: Array<{userId: string, score: number, factors: Array}> }>} */
const roleCache = new Map();

/** @type {{ fetchedAt: number, peers: Array<{userId: string, score: number, factors: Array}> } | null} */
let allPeersCache = null;

function bucketFor(score) {
  return BUCKETS.find((b) => score >= b.min && score <= b.max)?.key || BUCKETS[0].key;
}

/** Loads (and caches) every scored user targeting a given dream role. */
async function loadRolePeers(dreamRole) {
  const key = dreamRole.trim().toLowerCase();
  const cached = roleCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.peers;
  }

  const docs = await User.find({
    'profile.dreamRole': { $regex: `^${escapeRegex(dreamRole)}$`, $options: 'i' },
    'pathScoreCache.computedAt': { $ne: null },
  })
    .select('pathScoreCache')
    .lean();

  const peers = docs.map((d) => ({
    userId: String(d._id),
    score: d.pathScoreCache.displayScore ?? 0,
    factors: d.pathScoreCache.factors || [],
  }));

  roleCache.set(key, { fetchedAt: Date.now(), peers });
  return peers;
}

/**
 * Loads (and caches) every scored user across ALL roles — used as a fallback
 * comparison pool when a niche dream role doesn't have enough same-role peers
 * to compare against without risking de-anonymization.
 */
async function loadAllPeers() {
  if (allPeersCache && Date.now() - allPeersCache.fetchedAt < CACHE_TTL_MS) {
    return allPeersCache.peers;
  }

  const docs = await User.find({ 'pathScoreCache.computedAt': { $ne: null } })
    .select('pathScoreCache')
    .lean();

  const peers = docs.map((d) => ({
    userId: String(d._id),
    score: d.pathScoreCache.displayScore ?? 0,
    factors: d.pathScoreCache.factors || [],
  }));

  allPeersCache = { fetchedAt: Date.now(), peers };
  return peers;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds the full peer benchmark payload for a user.
 * @param {object} user - User document (needs profile.dreamRole + pathScoreCache)
 * @returns {Promise<object>}
 */
export async function getPeerBenchmark(user) {
  const dreamRole = user?.profile?.dreamRole;
  if (!dreamRole) {
    return { available: false, reason: 'no_dream_role' };
  }
  if (!user.pathScoreCache?.computedAt) {
    return { available: false, reason: 'no_score_yet' };
  }

  const userId = String(user._id);
  const roleScopedPeers = (await loadRolePeers(dreamRole)).filter((p) => p.userId !== userId);

  // Niche roles rarely have 5+ same-role peers. Rather than hiding the feature
  // entirely, fall back to comparing against every scored student on the
  // platform — still anonymous, just a broader (less role-specific) pool.
  let peers = roleScopedPeers;
  let scope = 'role';
  if (peers.length < MIN_PEER_SAMPLE) {
    const allScopedPeers = (await loadAllPeers()).filter((p) => p.userId !== userId);
    if (allScopedPeers.length >= MIN_PEER_SAMPLE) {
      peers = allScopedPeers;
      scope = 'platform';
    }
  }

  if (peers.length < MIN_PEER_SAMPLE) {
    return {
      available: false,
      reason: 'not_enough_peers',
      dreamRole,
      peerCount: roleScopedPeers.length,
      minRequired: MIN_PEER_SAMPLE,
    };
  }

  const yourScore = user.pathScoreCache.displayScore;
  const peerScores = peers.map((p) => p.score).sort((a, b) => a - b);

  // Percentile: what fraction of peers you outscored.
  const beatenCount = peerScores.filter((s) => s < yourScore).length;
  const betterThanPercent = Math.round((beatenCount / peerScores.length) * 100);
  // "Top X%" — clamp to 1 so a perfect score never reads as "top 0%".
  const topPercent = Math.max(1, 100 - betterThanPercent);

  // Histogram — bucket counts across peers only (self excluded, consistent with all stats here).
  const histogram = BUCKETS.map((b) => ({
    range: b.key,
    count: peers.filter((p) => p.score >= b.min && p.score <= b.max).length,
  }));
  const yourBucket = bucketFor(yourScore);

  // Top-10% threshold = score at the 90th percentile among peers.
  const sortedDesc = [...peerScores].sort((a, b) => b - a);
  const top10Index = Math.max(0, Math.floor(sortedDesc.length * 0.1) - 1);
  const top10Threshold = sortedDesc[top10Index] ?? sortedDesc[0];
  const alreadyTopTier = yourScore >= top10Threshold;
  const pointsToNextTier = alreadyTopTier ? 0 : Math.max(1, top10Threshold - yourScore);

  // Per-factor comparison — average each factor across peers, compare to yours.
  const factorKeys = (user.pathScoreCache.factors || []).map((f) => f.key);
  const factorComparison = factorKeys.map((key) => {
    const yourFactor = user.pathScoreCache.factors.find((f) => f.key === key);
    const peerValues = peers
      .map((p) => p.factors.find((f) => f.key === key)?.score)
      .filter((v) => typeof v === 'number');
    const peerAvg = peerValues.length
      ? Math.round((peerValues.reduce((a, b) => a + b, 0) / peerValues.length) * 10) / 10
      : null;

    let status = 'about_average';
    if (peerAvg !== null) {
      const diff = yourFactor.score - peerAvg;
      if (diff >= 1.5) status = 'above';
      else if (diff <= -1.5) status = 'below';
    }

    return {
      key,
      label: yourFactor.label,
      yourScore: yourFactor.score,
      max: yourFactor.max,
      peerAvg,
      status, // 'above' | 'below' | 'about_average'
    };
  });

  return {
    available: true,
    dreamRole,
    scope, // 'role' | 'platform' — 'platform' means not enough same-role peers, comparing against all users instead
    peerCount: peers.length,
    yourScore,
    betterThanPercent,
    topPercent,
    histogram,
    yourBucket,
    alreadyTopTier,
    pointsToNextTier,
    factorComparison,
  };
}
