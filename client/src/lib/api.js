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
 * - baseURL: '/api' means all requests go to the same origin (Vite proxies /api → Node backend)
 * - withCredentials: true sends the HttpOnly refresh cookie on every request automatically
 */
export const api = axios.create({
  baseURL: '/api',
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

api.interceptors.response.use(
  // Pass through all successful responses unchanged
  (res) => res,

  async (error) => {
    const original = error.config;             // the original request config
    const status = error.response?.status;

    // Only auto-refresh on 401, only once per request, and never for /auth/ routes
    // (to prevent infinite loops when /auth/refresh itself returns 401).
    const isAuthRoute = original?.url?.includes('/auth/');
    if (status === 401 && !original._retry && !isAuthRoute) {
      original._retry = true; // mark so we don't retry again

      try {
        // Use an existing in-flight refresh promise if available,
        // otherwise start a new one. `.finally` clears the variable when done.
        refreshing =
          refreshing ||
          api.post('/auth/refresh').finally(() => {
            refreshing = null;
          });

        const { data } = await refreshing;
        setAccessToken(data.data.accessToken); // store new access token

        // Patch the original request's header and retry it
        original.headers.Authorization = `Bearer ${getAccessToken()}`;
        return api(original);
      } catch {
        // Refresh also failed → user is truly logged out
        setAccessToken(null);
      }
    }
    return Promise.reject(error); // propagate the error to the calling component
  }
);

/**
 * Helper: converts an Axios error into a human-readable string.
 * Components use this to show toast error messages without writing the
 * same `err?.response?.data?.message || err.message` chain everywhere.
 *
 * @param {Error}  err      - the caught Axios error
 * @param {string} fallback - shown if no meaningful message is found
 */
export function errorMessage(err, fallback = 'Something went wrong') {
  return err?.response?.data?.message || err?.message || fallback;
}
