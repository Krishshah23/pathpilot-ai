/**
 * lib/api.js — Central HTTP Client
 *
 * All API calls in the frontend go through this single Axios instance.
 * Never import raw `axios` in pages/components — always use `api` from here.
 * This keeps auth headers, token refresh, and error handling in one place.
 *
 * HOW AUTH WORKS (Two-Token Pattern):
 * ┌─────────────┐        ┌─────────────────────┐
 * │  Access Token│        │  Refresh Token (cookie)│
 * │  Short-lived │        │  HttpOnly, secure       │
 * │  ~15 minutes │        │  ~7 days               │
 * │  Sent in     │        │  Sent automatically     │
 * │  Authorization│       │  by the browser on     │
 * │  header      │        │  every request          │
 * └─────────────┘        └─────────────────────────┘
 *
 * On page load: we call /auth/refresh (using the cookie) to get a fresh access token.
 * On 401 error: we silently try /auth/refresh once, then retry the original request.
 * On logout:    we clear the access token from memory + localStorage.
 *
 * The refresh token lives in an HttpOnly cookie — JavaScript cannot read it directly,
 * which protects it from XSS attacks.
 */

import axios from 'axios';

// The key used to persist the access token in localStorage across page refreshes.
// On first load, AuthContext reads this to check if a user was previously logged in.
const ACCESS_KEY = 'pp_access_token';

// In-memory copy of the current access token.
// Using a module-level variable (not React state) means it's always available
// synchronously for the request interceptor below.
let accessToken = localStorage.getItem(ACCESS_KEY) || null;

/**
 * Call this whenever the access token changes (login, refresh, logout).
 * It keeps the in-memory variable and localStorage in sync.
 */
export function setAccessToken(token) {
  accessToken = token;
  if (token) localStorage.setItem(ACCESS_KEY, token); // save so reload still works
  else localStorage.removeItem(ACCESS_KEY);            // clear on logout
}

/** Read the current access token (used by the request interceptor). */
export function getAccessToken() {
  return accessToken;
}

/**
 * The Axios instance all API calls use.
 * - baseURL: in dev, '/api' is relative — Vite proxies it to the local Node
 *   backend (see vite.config.js). In production the client and server are
 *   deployed as separate services on different domains, so VITE_API_URL
 *   (set at build time) points straight at the deployed server's /api.
 * - withCredentials: true sends the HttpOnly refresh cookie on every request
 *   automatically — required for this to work cross-site in prod (see the
 *   sameSite:'none' cookie config on the server, auth.controller.js).
 */
function getSanitizedBaseURL() {
  let envUrl = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').trim();
  if ((envUrl.startsWith('"') && envUrl.endsWith('"')) || (envUrl.startsWith("'") && envUrl.endsWith("'"))) {
    envUrl = envUrl.slice(1, -1).trim();
  }
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api`;
  }
  return '/api';
}

export const api = axios.create({
  baseURL: getSanitizedBaseURL(),
  withCredentials: true, // required for the refresh cookie to be sent
});

// ── Request Interceptor ───────────────────────────────────────────────────────
// Runs BEFORE every outgoing request. Attaches the access token as a Bearer header.
// Bearer scheme means: "the bearer of this token is who they claim to be".
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ── Response Interceptor (Token Refresh on 401) ───────────────────────────────
// Runs AFTER every response. If the server responds with 401 (Unauthorized),
// it means the access token has expired. We silently mint a new one using
// the refresh cookie, then retry the original failed request.
//
// `refreshing` is a "single-flight" variable: if multiple requests fail at the
// same moment, they all share one refresh call instead of firing many refresh
// requests simultaneously.
let refreshing = null;

const MAX_COLD_RETRIES = 2;
const COLD_RETRY_DELAY = 3000;

api.interceptors.response.use(
  (res) => res,

  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // Retry on 502/503 (Render cold start) — up to 2 retries with 3s delay
    if ((status === 502 || status === 503) && !original._authRetry) {
      const retryCount = original._coldRetry || 0;
      if (retryCount < MAX_COLD_RETRIES) {
        original._coldRetry = retryCount + 1;
        await new Promise((r) => setTimeout(r, COLD_RETRY_DELAY));
        return api(original);
      }
    }

    // Auto-refresh on 401 (expired access token)
    const isAuthRoute = original?.url?.includes('/auth/');
    if (status === 401 && !original._authRetry && !isAuthRoute) {
      original._authRetry = true;

      try {
        refreshing =
          refreshing ||
          api.post('/auth/refresh').finally(() => {
            refreshing = null;
          });

        const { data } = await refreshing;
        setAccessToken(data.data.accessToken);

        original.headers.Authorization = `Bearer ${getAccessToken()}`;
        return api(original);
      } catch {
        setAccessToken(null);
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Helper: converts an Axios error into a human-readable string.
 * Components use this to show toast error messages without writing the
 * same `err?.response?.data?.message || err.message` chain everywhere.
 *
 * For validation errors (400s from Zod or Mongoose), the server also sends a
 * `details` array — either `[{ field, message }]` (Zod) or `[message, ...]`
 * (Mongoose) — that the top-level `message` alone doesn't convey (e.g. a bare
 * "Validation failed"). Append the first couple of those so the toast is
 * actually diagnosable instead of generic.
 *
 * @param {Error}  err      - the caught Axios error
 * @param {string} fallback - shown if no meaningful message is found
 */
export function errorMessage(err, fallback = 'Something went wrong') {
  const data = err?.response?.data;
  const base = data?.message || err?.message || fallback;

  if (Array.isArray(data?.details) && data.details.length > 0) {
    const detailText = data.details
      .slice(0, 2)
      .map((d) => (typeof d === 'string' ? d : d?.message))
      .filter(Boolean)
      .join('; ');
    if (detailText) return `${base}: ${detailText}`;
  }

  return base;
}
