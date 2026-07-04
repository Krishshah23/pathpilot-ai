import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { FullScreenLoader } from '@/components/ui/Spinner';

/** Blocks a route until authenticated; remembers where the user was heading. */
export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader label="Restoring your session…" />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

/** Keeps authenticated users out of auth pages (login/register). */
export function PublicOnlyRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <FullScreenLoader />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

/**
 * Requires a completed onboarding before accessing app pages. Incomplete users
 * are sent to the wizard. Use inside ProtectedRoute, around feature pages only
 * (not the onboarding page itself).
 */
export function RequireOnboarding() {
  const { user } = useAuth();
  if (user && !user.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }
  return <Outlet />;
}

/**
 * Restricts a route to admin users. Redirects students to the dashboard.
 * Use inside ProtectedRoute + RequireOnboarding.
 */
export function RequireAdmin() {
  const { user } = useAuth();
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
