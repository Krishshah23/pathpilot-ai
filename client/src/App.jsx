import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute, RequireOnboarding, RequireAdmin } from '@/routes/guards';
import { FullScreenLoader } from '@/components/ui/Spinner';

// Auth pages are small and needed immediately — import eagerly.
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage';

// Feature pages are code-split so heavy deps (e.g. charts) load on demand.
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const ResumePage = lazy(() => import('@/pages/ResumePage'));
const PathScorePage = lazy(() => import('@/pages/PathScorePage'));
const GapNavigatorPage = lazy(() => import('@/pages/GapNavigatorPage'));
const GrowthPage = lazy(() => import('@/pages/GrowthPage'));
const InsightsPage = lazy(() => import('@/pages/InsightsPage'));
const OpportunityPage = lazy(() => import('@/pages/OpportunityPage'));
const ReportPage = lazy(() => import('@/pages/ReportPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<FullScreenLoader />}>
        <Routes>
          {/* Public auth routes (redirect away if already logged in) */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          {/* Reachable regardless of auth state */}
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* Protected app routes */}
          <Route element={<ProtectedRoute />}>
            {/* Onboarding is reachable before it's completed */}
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* Feature pages require completed onboarding */}
            <Route element={<RequireOnboarding />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/resume" element={<ResumePage />} />
              <Route path="/path-score" element={<PathScorePage />} />
              <Route path="/gap" element={<GapNavigatorPage />} />
              <Route path="/growth" element={<GrowthPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/opportunities" element={<OpportunityPage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              {/* Admin-only routes */}
              <Route element={<RequireAdmin />}>
                <Route path="/admin" element={<AdminPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
