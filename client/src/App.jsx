import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute, RequireOnboarding, RequireAdmin, StudentOnlyRoute } from '@/routes/guards';
import { FullScreenLoader } from '@/components/ui/Spinner';

// Auth pages — eagerly imported (small, needed immediately)
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage';

// ── 4 Hub Pages (code-split) ─────────────────────────────────────────
const OnboardingPage     = lazy(() => import('@/pages/OnboardingPage'));
const OverviewPage       = lazy(() => import('@/pages/OverviewPage'));
const TalentAnalyzerPage = lazy(() => import('@/pages/TalentAnalyzerPage'));
const ExecutionEnginePage= lazy(() => import('@/pages/ExecutionEnginePage'));
const InterviewPrepPage  = lazy(() => import('@/pages/InterviewPrepPage'));
const AdminPage          = lazy(() => import('@/pages/AdminPage'));
const PublicProfilePage  = lazy(() => import('@/pages/PublicProfilePage'));
const NotFoundPage       = lazy(() => import('@/pages/NotFoundPage'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<FullScreenLoader />}>
        <Routes>
          {/* ── Public auth routes ── */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login"           element={<LoginPage />} />
            <Route path="/register"        element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          {/* ── Always reachable ── */}
          <Route path="/reset-password"       element={<ResetPasswordPage />} />
          <Route path="/verify-email"         element={<VerifyEmailPage />} />
          <Route path="/profile/:publicCardId" element={<PublicProfilePage />} />

          {/* ── Protected app routes ── */}
          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<OnboardingPage />} />

            <Route element={<RequireOnboarding />}>
              {/* ── Student-only routes (admins are redirected away) ── */}
              <Route element={<StudentOnlyRoute />}>
                <Route path="/dashboard"        element={<OverviewPage />} />
                <Route path="/talent-analyzer"  element={<TalentAnalyzerPage />} />
                <Route path="/execution-engine" element={<ExecutionEnginePage />} />
                <Route path="/interview-prep"   element={<InterviewPrepPage />} />

                {/* ── Legacy redirect map (old routes → new hubs) ── */}
                <Route path="/resume"        element={<Navigate to="/talent-analyzer"  replace />} />
                <Route path="/gap"           element={<Navigate to="/talent-analyzer"  replace />} />
                <Route path="/growth"        element={<Navigate to="/execution-engine" replace />} />
                <Route path="/opportunities" element={<Navigate to="/execution-engine" replace />} />
                <Route path="/path-score"    element={<Navigate to="/dashboard"        replace />} />
                <Route path="/insights"      element={<Navigate to="/dashboard"        replace />} />
                <Route path="/report"        element={<Navigate to="/dashboard"        replace />} />
                <Route path="/interview"     element={<Navigate to="/interview-prep"   replace />} />
                <Route path="/profile"       element={<Navigate to="/dashboard"        replace />} />
              </Route>

              {/* ── Admin ── */}
              <Route element={<RequireAdmin />}>
                <Route path="/admin" element={<AdminPage />} />
              </Route>
            </Route>
          </Route>

          {/* ── Root + catch-all ── */}
          <Route path="/"  element={<Navigate to="/dashboard" replace />} />
          <Route path="*"  element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
