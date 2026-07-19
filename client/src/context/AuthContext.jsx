/**
 * context/AuthContext.jsx — Global Authentication State
 *
 * Creates a React Context to share the logged-in user with any component
 * without manually passing props through every level.
 *
 * HOW IT WORKS:
 *  1. <AuthProvider> wraps the whole app (see main.jsx).
 *  2. On mount it calls /auth/refresh to silently restore a previous session
 *     using the refresh token cookie, so a page reload keeps the user logged in.
 *  3. Any component calls `useAuth()` to get the user and actions like login/logout.
 *
 * STATE:
 *  - user    : the logged-in user object from the server (null = not logged in)
 *  - loading : true while we are checking for an existing session (prevents flicker)
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setAccessToken } from '@/lib/api';

// Context object — consumed by useAuth() below
const AuthContext = createContext(null);

/**
 * AuthProvider — wraps the app and holds the logged-in user state.
 * Exposes user data and auth actions (login, register, logout) to all children.
 */
export function AuthProvider({ children }) {
  // `user` is the logged-in user object, or null if no session
  const [user, setUser] = useState(null);

  // `loading` stays true until we finish checking for an existing session.
  // During this time, route guards show a spinner instead of the login page.
  const [loading, setLoading] = useState(true);

  /**
   * Fetches the current user from GET /auth/me and stores it in state.
   * useCallback avoids re-creating the function on every render (which would
   * trigger the useEffect below in an infinite loop).
   */
  const loadMe = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.data.user);
    return data.data.user;
  }, []);

  // ── Silent session restore on page load ─────────────────────────────────
  // Runs once when the app mounts. Tries to exchange the refresh cookie for
  // a new access token. If successful, also fetches the user profile.
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.post('/auth/refresh'); // browser sends cookie automatically
        setAccessToken(data.data.accessToken);             // store access token in memory
        await loadMe();                                    // fetch the user profile
      } catch {
        // No valid session — clear token and leave user as null
        setAccessToken(null);
        setUser(null);
      } finally {
        setLoading(false); // done checking — render the app
      }
    })();
  }, [loadMe]);

  /** Stores the access token AND the user object after login or register. */
  const applySession = (payload) => {
    setAccessToken(payload.accessToken);
    setUser(payload.user);
  };

  /** Log in with email + password. Returns the user object on success. */
  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    applySession(data.data);
    return data.data.user;
  };

  /** Create a new account. Returns the user object on success. */
  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    applySession(data.data);
    return data.data.user;
  };

  /**
   * Log out. Asks the backend to clear the refresh cookie, then clears
   * the client-side token and user. `finally` runs even if the request fails,
   * so the user is always logged out locally.
   */
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  // Everything child components can access via useAuth()
  const value = {
    user,                    // current user object (or null)
    setUser,                 // lets profile page update the user directly
    loading,                 // true while session check is in progress
    isAuthenticated: !!user, // convenience: true when a user is logged in
    login,
    register,
    logout,
    refreshUser: loadMe,     // re-fetches user — call after profile updates
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth — hook to access auth context from any component.
 *
 * Usage:
 *   const { user, login, logout, isAuthenticated } = useAuth();
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
