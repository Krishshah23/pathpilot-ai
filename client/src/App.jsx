/**
 * App.jsx — Root Routing Component
 *
 * This component defines ALL the URL routes for the entire application.
 * It uses React Router v6, so instead of `<Switch>` (old), we use `<Routes>`.
 *
 * KEY CONCEPT — Code Splitting with lazy():
 *   The big page components (Dashboard, Resume, etc.) are NOT loaded upfront.
 *   `lazy()` tells the bundler to split them into separate JS files that are
 *   downloaded only when the user first visits that page. This keeps the initial
 *   load fast. `<Suspense fallback={...}>` shows a spinner while the chunk loads.
 *
 * KEY CONCEPT — Route Guards:
 *   Not all routes are accessible to everyone. We use wrapper components called
 *   "guards" (see routes/guards.jsx) that check conditions before rendering a page:
 *     • ProtectedRoute   → user must be logged in
 *     • PublicOnlyRoute  → logged-in users are redirected away (e.g. /login)
 *     • RequireOnboarding → user must have completed the 2-step setup wizard
 *     • RequireAdmin     → only admin-role accounts can access /admin
 *     • StudentOnlyRoute → admin accounts are redirected away from student pages
 *
 * ROUTE STRUCTURE (nesting reflects the guard layers):
 *   /login, /register, /forgot-password  — public only (guests)
 *   /reset-password, /verify-email       — always reachable (no session needed)
 *   /profile/:publicCardId               — always reachable (shareable URL)
 *   /onboarding                          — logged in, but onboarding not done yet
 *   /dashboard, /talent-analyzer, ...    — logged in + onboarding done + student
 *   /admin                               — logged in + admin role only
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute, RequireOnboarding, RequireAdmin, StudentOnlyRoute } from '@/routes/guards';
import { FullScreenLoader } from '@/components/ui/Spinner';

// Auth pages are small and needed immediately on first visit, so we import them
// eagerly (no lazy) to avoid an extra network round-trip on the login page.
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage';

// ── 4 Hub Pages (code-split) ─────────────────────────────────────────
// These large pages are lazy-loaded: the browser downloads their JS only when
// the user navigates to them, not before. This makes the initial app load faster.
const OnboardingPage     = lazy(() => import('@/pages/OnboardingPage'));
const OverviewPage       = lazy(() => import('@/pages/OverviewPage'));        // /dashboard
const TalentAnalyzerPage = lazy(() => import('@/pages/TalentAnalyzerPage')); // /talent-analyzer (Resume + Gap)
const ExecutionEnginePage= lazy(() => import('@/pages/ExecutionEnginePage')); // /execution-engine (Roadmap + Jobs)
const InterviewPrepPage  = lazy(() => import('@/pages/InterviewPrepPage'));   // /interview-prep (Mock interview)
const AdminPage          = lazy(() => import('@/pages/AdminPage'));
const PublicProfilePage  = lazy(() => import('@/pages/PublicProfilePage'));   // shareable career card
const ProfilePage        = lazy(() => import('@/pages/ProfilePage'));
const CareerReportPage   = lazy(() => import('@/pages/CareerReportPage'));
const NotFoundPage       = lazy(() => import('@/pages/NotFoundPage'));

export default function App() {
  return (
    // BrowserRouter enables history-based navigation (real URLs like /dashboard, not /#/dashboard)
    <BrowserRouter>
      {/* Suspense shows the full-screen spinner while a lazy page chunk is downloading */}
      <Suspense fallback={<FullScreenLoader />}>
        <Routes>

          {/* ── Public auth routes ── */}
          {/* PublicOnlyRoute redirects already-logged-in users to /dashboard */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login"           element={<LoginPage />} />
            <Route path="/register"        element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          {/* ── Always reachable (no auth check) ── */}
          {/* Password reset links arrive via email, so they can't require login */}
          <Route path="/reset-password"       element={<ResetPasswordPage />} />
          <Route path="/verify-email"         element={<VerifyEmailPage />} />
          {/* Anyone with the link can view a public career profile card */}
          <Route path="/profile/:publicCardId" element={<PublicProfilePage />} />

          {/* ── Protected app routes (must be logged in) ── */}
          <Route element={<ProtectedRoute />}>
            {/* Onboarding is accessible once logged in, even before the wizard is done */}
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* All feature pages additionally require onboarding to be completed */}
            <Route element={<RequireOnboarding />}>

              {/* ── Student-only routes (admins see /admin instead) ── */}
              <Route element={<StudentOnlyRoute />}>
                <Route path="/dashboard"        element={<OverviewPage />} />
                <Route path="/talent-analyzer"  element={<TalentAnalyzerPage />} />
                <Route path="/execution-engine" element={<ExecutionEnginePage />} />
                <Route path="/interview-prep"   element={<InterviewPrepPage />} />
                <Route path="/report"           element={<CareerReportPage />} />

                {/* ── Legacy redirect map (old routes → new hubs) ── */}
                {/* These keep old bookmarks working by silently redirecting */}
                <Route path="/resume"        element={<Navigate to="/talent-analyzer"  replace />} />
                <Route path="/gap"           element={<Navigate to="/talent-analyzer"  replace />} />
                <Route path="/growth"        element={<Navigate to="/execution-engine" replace />} />
                <Route path="/opportunities" element={<Navigate to="/execution-engine" replace />} />
                <Route path="/path-score"    element={<Navigate to="/dashboard"        replace />} />
                <Route path="/insights"      element={<Navigate to="/dashboard"        replace />} />
                <Route path="/interview"     element={<Navigate to="/interview-prep"   replace />} />
                <Route path="/profile"       element={<ProfilePage />} />
              </Route>

              {/* ── Admin-only routes ── */}
              <Route element={<RequireAdmin />}>
                <Route path="/admin" element={<AdminPage />} />
              </Route>
            </Route>
          </Route>

          {/* ── Root + catch-all ── */}
          {/* Visiting "/" redirects to the dashboard */}
          <Route path="/"  element={<Navigate to="/dashboard" replace />} />
          {/* Any unrecognised URL shows the 404 page */}
          <Route path="*"  element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
