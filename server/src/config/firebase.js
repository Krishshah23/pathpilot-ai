/**
 * config/firebase.js — Firebase Admin SDK Initialization
 *
 * WHY THIS EXISTS:
 * The client signs users in with Google via Firebase's client SDK and gets back
 * a Firebase idToken. That token cannot be trusted as-is — anyone could forge a
 * similar-looking JWT. firebase-admin verifies the token's signature against
 * Google's public keys, proving it was genuinely issued by Firebase for this project.
 *
 * MODULAR API:
 * firebase-admin v13+ dropped the old `admin.apps` / `admin.auth()` namespace API
 * from its root import — everything now lives under subpath imports
 * (`firebase-admin/app`, `firebase-admin/auth`), matching the modular style of
 * the Firebase JS SDK.
 *
 * SINGLETON CHECK:
 * `getApps().length` prevents re-initializing the app on hot-reload (nodemon)
 * or if this module is imported from multiple places — initializeApp() throws
 * if called twice for the same app name.
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { env } from './env.js';

/**
 * Env vars store the private key as a single-line string with literal "\n"
 * sequences (real newlines aren't valid in a .env value or most hosting
 * dashboards' env var fields) — this converts it back into a real multi-line
 * PEM key. Defensively also strips a wrapping pair of quotes, since pasting
 * the value straight from the downloaded service-account JSON (which quotes
 * the string) is the single most common way this breaks in production.
 */
function normalizePrivateKey(key) {
  if (!key) return key;
  let normalized = key.trim();
  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1);
  }
  return normalized.replace(/\\n/g, '\n');
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: env.firebase.projectId,
      clientEmail: env.firebase.clientEmail,
      privateKey: normalizePrivateKey(env.firebase.privateKey),
    }),
  });
}

export const adminAuth = getAuth();
