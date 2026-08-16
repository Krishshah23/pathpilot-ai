/**
 * config/env.js — Centralized Environment Configuration
 *
 * WHY THIS EXISTS:
 * Reading process.env directly in each file causes two problems:
 *   1. Typos in variable names fail silently (undefined instead of error).
 *   2. Type coercion is forgotten (process.env.PORT is a string, not a number).
 *   3. Required variable checks are scattered across the codebase.
 *
 * This file is the SINGLE source of truth for all env variables.
 * Everything that needs a config value imports `env` from here.
 *
 * HOW TO ADD A NEW ENV VARIABLE:
 *   1. Add it to .env.example with a placeholder value and a comment.
 *   2. Add the reading logic here (with a sensible default for dev).
 *   3. If it's required in production, add its key to the `required` array.
 *
 * STARTUP BEHAVIOR:
 * - dotenv reads .env (if it exists) and populates process.env at require-time.
 * - `required` array is checked; missing keys print a warning (not an error)
 *   to allow the app to still start in CI environments with partial configs.
 */

import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env file into process.env. This is a no-op if .env doesn't exist.
// In production (Render, Railway, etc.), env vars are injected by the platform
// and .env doesn't exist — that's fine.
dotenv.config();

// List of variables that MUST be present for the app to function correctly.
// Missing these in production means the app will silently break (wrong JWT secret = all tokens invalid, etc.)
const required = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'TOKEN_SECRET'];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  // eslint-disable-next-line no-console
  console.warn(
    `⚠️  Missing env vars: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`
  );
}

// Firebase Admin credentials are required for Google OAuth (POST /api/auth/google).
// Validated separately (rather than added to `required`) so the app can still boot
// without Google Sign-In configured — only that one route will fail.
const firebaseEnvSchema = z.object({
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z.string().min(1),
});

const firebaseEnvResult = firebaseEnvSchema.safeParse({
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
});

if (!firebaseEnvResult.success) {
  // eslint-disable-next-line no-console
  console.warn('⚠️  Firebase Admin env vars missing/invalid — Google Sign-In will not work.');
}

// INTERNAL_API_KEY is the only thing gating every Django ML endpoint (see
// ai-service/ml/views.py's require_internal_key decorator) — it's the boundary that
// stops the browser or any other external caller from hitting Django directly. Django's
// own settings.py already refuses to boot with DEBUG=False while its secrets are still
// the known, source-visible placeholder defaults (see ai-service/config/settings.py).
// Node had no equivalent: a production deploy that forgot to set INTERNAL_API_KEY would
// previously fall back to 'dev-internal-key' with nothing but a console.warn — Django's
// fail-closed check can't catch that, because it only knows about *its own* defaults, not
// what Node sends. Mirror Django's behavior here: fail loudly at startup instead.
const DEFAULT_INTERNAL_API_KEY = 'dev-internal-key';
const resolvedInternalApiKey = process.env.INTERNAL_API_KEY || DEFAULT_INTERNAL_API_KEY;

if (process.env.NODE_ENV === 'production' && resolvedInternalApiKey === DEFAULT_INTERNAL_API_KEY) {
  throw new Error(
    'Refusing to start with NODE_ENV=production while INTERNAL_API_KEY is unset or still the ' +
      "insecure placeholder default ('dev-internal-key'). Set a real random value for it in the " +
      'environment before deploying — this key is the only thing preventing external callers from ' +
      'reaching the Django ML service directly.'
  );
}

/**
 * The exported `env` object is a typed, organized, defaulted config object.
 * Always import from here — never read process.env directly in controllers/services.
 */
export const env = {
  // ── Server ──────────────────────────────────────────────────────────────────

  // TCP port the Express server listens on. Default: 5000.
  port: Number(process.env.PORT) || 5000,

  // 'development' | 'production' | 'test'
  nodeEnv: process.env.NODE_ENV || 'development',

  // Shorthand boolean — used to conditionally enable/disable dev-only features
  // like morgan request logging or verbose error details in responses.
  isProd: process.env.NODE_ENV === 'production',

  // The URL of the React client — used for CORS allow-list.
  // In production this should be your deployed frontend domain (e.g. https://pathpilot.ai).
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  // ── Database ─────────────────────────────────────────────────────────────────

  // MongoDB Atlas connection string. Format: mongodb+srv://user:pass@cluster.mongodb.net/dbname
  mongoUri: process.env.MONGODB_URI,

  // ── JWT Authentication ────────────────────────────────────────────────────────

  jwt: {
    // Secret used to sign short-lived access tokens (15m default).
    // If this is compromised, rotate it — all existing access tokens become invalid immediately.
    accessSecret: process.env.JWT_ACCESS_SECRET,

    // How long an access token lives before the client must refresh it.
    // Short duration = better security (compromised token expires quickly).
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',

    // Secret used to sign long-lived refresh tokens (7d default).
    // Stored in an HttpOnly cookie — JavaScript cannot read it.
    refreshSecret: process.env.JWT_REFRESH_SECRET,

    // How long a refresh token cookie lives before the user must log in again.
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },

  // Separate secret for email-verification and password-reset tokens.
  // These are single-use short-lived tokens sent via email links.
  tokenSecret: process.env.TOKEN_SECRET,

  // ── Internal Service Communication ────────────────────────────────────────────

  // Base URL of the Django ML service. Node uses this when proxying requests to Django.
  // IMPORTANT: The browser NEVER talks to Django — only Node does.
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',

  // Shared secret that must be sent as X-Internal-Key header on every Node→Django call.
  // Django checks this key to reject requests not coming from Node (prevents direct browser access).
  // Fails fast at startup above if this is still the default in production.
  internalApiKey: resolvedInternalApiKey,

  // ── Email (Nodemailer) ───────────────────────────────────────────────────────

  email: {
    // SMTP server settings. In development, if all are blank, emails are logged to console.
    // For production, use a service like Resend, Postmark, SendGrid, or Gmail SMTP.
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,

    // The "From" field shown to recipients.
    from: process.env.EMAIL_FROM || 'PathPilot AI <no-reply@pathpilot.ai>',
  },

  // ── Adzuna Job Market API ────────────────────────────────────────────────────
  // Used by jobMarket.service.js to fetch weekly job listings from India.
  // Parsed data is stored in JobMarketSnapshot collection and powers the
  // "Market Intelligence" panel and salary estimate.
  // Free registration at https://developer.adzuna.com
  adzuna: {
    appId: process.env.ADZUNA_APP_ID || '',
    appKey: process.env.ADZUNA_APP_KEY || '',
  },

  // ── TheirStack Live Jobs API ─────────────────────────────────────────────────
  // Used by liveJobs.service.js to fetch real-time job openings.
  // Results are cached in MongoDB (default 72-hour TTL) and strictly capped to the
  // free-tier monthly budget (200 credits/month · 8 credits per search call).
  // Register at https://theirstack.com to get a key.
  theirstack: {
    apiKey: process.env.THEIRSTACK_API_KEY || '',
    monthlyCreditLimit: Number(process.env.THEIRSTACK_MONTHLY_CREDIT_LIMIT) || 200,
    creditsPerRequest: Number(process.env.THEIRSTACK_CREDITS_PER_REQUEST) || 8,
    cacheTtlHours: Number(process.env.THEIRSTACK_CACHE_TTL_HOURS) || 72,
  },

  // ── Google Gemini AI ─────────────────────────────────────────────────────────
  // Used by gemini.service.js for ALL LLM features:
  //   - Resume role-fit analysis
  //   - AI career coaching chat
  //   - Interview question generation and answer evaluation
  //   - Resume parsing fallback (if Django returns low-quality parse)
  // Get a free key at https://aistudio.google.com
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',

    // The specific Gemini model variant to use.
    // Valid options: 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash'
    // NOTE: 'gemini-2.0-flash' and 'gemini-1.5-*' free-tier quotas are zeroed/sunset.
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  },

  // ── Firebase Admin (Google OAuth verification) ───────────────────────────────
  // Used by config/firebase.js to initialize firebase-admin, which verifies
  // Google idTokens sent from the client after signInWithPopup().
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY || '',
  },
};
