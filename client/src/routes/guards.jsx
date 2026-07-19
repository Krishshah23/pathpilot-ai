/**
 * routes/guards.jsx — Route Guard Components
 *
 * Route guards are wrapper components that sit around pages in the router
 * (App.jsx) and decide whether to render the page or redirect the user.
 * They use React Router's <Outlet /> to render the matched child route.
 *
 * GUARD SUMMARY:
 * ┌────────────────────┬───────────────────────────────────────────────────────┐
 * │ Guard              │ What it checks / does                                 │
 * ├────────────────────┼───────────────────────────────────────────────────────┤
 * │ ProtectedRoute     │ Must be logged in. Guests → /login                    │
 * │ PublicOnlyRoute    │ Must NOT be logged in. Logged-in → /dashboard         │
 * │ RequireOnboarding  │ Must have finished the wizard. Not done → /onboarding │
 * │ RequireAdmin       │ Must have role=admin. Students → /dashboard           │
 * │ StudentOnlyRoute   │ Must NOT be admin. Admins → /admin                    │
 * └────────────────────┴───────────────────────────────────────────────────────┘
 *
 * PATTERN:
 *   All guards show a spinner while `loading` is true (session is being restored).
 *   Once loading finishes, they check the condition and either render <Outlet />
 *   (the matched child route) or redirect with <Navigate />.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { FullScreenLoader } from '@/components/ui/Spinner';

/**
 * ProtectedRoute — blocks access until the user is authenticated.
 *
 * It also captures where the user was trying to go (`location`) so after
 * they log in, they can be redirected back there automatically.
 *
 * Example: user visits /dashboard → not logged in → sent to /login
 *          after login → sent back to /dashboard (not just the homepage)
 */
export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation(); // current URL, passed to /login so we can redirect back

  // Still checking for an existing session — show spinner, don't redirect yet
  if (loading) return <FullScreenLoader label="Restoring your session…" />;

  // Not logged in → go to /login. `state` carries the current path so login
  // can redirect back after success. `replace` avoids a back-button loop.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // All good — render the matched child route
  return <Outlet />;
}

/**
 * PublicOnlyRoute — keeps authenticated users out of auth pages.
 *
 * Prevents a logged-in user from seeing /login or /register.
 * Admins go to /admin; students go to /dashboard.
 */
export function PublicOnlyRoute() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return <FullScreenLoader />;

  // Already logged in → redirect away from the auth page
  if (isAuthenticated) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return <Outlet />;
}

/**
 * RequireOnboarding — ensures the user has completed the 2-step setup wizard.
 *
 * The wizard collects `dreamRole` and `skills`, which are required for the AI
 * features to work. Until they are set, every feature page redirects to /onboarding.
 *
 * Place this INSIDE ProtectedRoute and OUTSIDE the individual page routes:
 *   <ProtectedRoute>
 *     <RequireOnboarding>
 *       <Route path="/dashboard" ... />
 *     </RequireOnboarding>
 *   </ProtectedRoute>
 */
export function RequireOnboarding() {
  const { user } = useAuth();

  // `onboardingCompleted` is set to true on the user document after the wizard finishes
  if (user && !user.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}

/**
 * RequireAdmin — restricts a route to users with role='admin'.
 *
 * Students trying to access /admin are redirected to /dashboard.
 * Use this inside both ProtectedRoute and RequireOnboarding.
 */
export function RequireAdmin() {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

/**
 * StudentOnlyRoute — blocks admin accounts from student pages.
 *
 * Admin users have a separate interface (/admin) and should not mix
 * with the student product features. If an admin somehow reaches a student
 * page, they are redirected back to /admin.
 */
export function StudentOnlyRoute() {
  const { user } = useAuth();

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
