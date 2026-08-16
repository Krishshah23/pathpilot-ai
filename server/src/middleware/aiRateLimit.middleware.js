/**
 * middleware/aiRateLimit.middleware.js — Rate Limits for Gemini-Backed Routes
 *
 * WHY THIS EXISTS:
 * Every route wrapped here calls out to the Gemini API (`gemini.service.js`), which is
 * metered and billed. Unlike `auth.routes.js`'s login/register limiter — which exists to
 * slow down brute-force guessing on a free operation — these limiters exist to cap real
 * spend per user. An authenticated user (or a compromised token) looping one of these
 * endpoints has no cost ceiling otherwise; Google's own quota is the only backstop, and
 * that fails the whole service for every user, not just the abusive one.
 *
 * KEYED BY USER, NOT IP:
 * All routes below sit behind `protect`, so `req.user` is always populated by the time
 * this middleware runs. Keying by user id (instead of the express-rate-limit default of
 * IP) means users behind a shared/corporate NAT don't share a quota, and a user can't
 * dodge the limit by switching networks.
 *
 * TWO TIERS:
 *   - `aiActionLimiter`  (15 / 15 min) — single-shot actions: rewrite one bullet, generate
 *     one summary, run one optimize pass, send one chat message. A real editing session
 *     touches these a handful of times, not dozens — 15 gives generous headroom for normal
 *     iteration (try a rewrite, tweak, try again) while still capping a scripted loop.
 *   - `interviewLimiter` (30 / 15 min) — mock interview question/evaluate calls come in
 *     pairs per round (ask → evaluate), and a full practice session naturally runs
 *     8-15 rounds (16-30 calls) in one sitting. 30 covers a complete session without
 *     forcing a resume-builder-sized cap onto a workflow that's inherently more
 *     call-heavy by design.
 */

import rateLimit from 'express-rate-limit';

/** Rate-limit key: authenticated user id (falls back to IP if somehow unauthenticated). */
function userKey(req) {
  return req.user?._id?.toString() || req.ip;
}

function aiLimiter({ max, message }) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: userKey,
    message: { success: false, message },
  });
}

export const aiActionLimiter = aiLimiter({
  max: 15,
  message: 'AI request limit reached. Please wait a few minutes and try again.',
});

export const interviewLimiter = aiLimiter({
  max: 30,
  message: 'Mock interview request limit reached. Please wait a few minutes and try again.',
});
