import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input, PasswordInput } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { errorMessage } from '@/lib/api';
import { GoogleGLogo } from '@/components/ui/GoogleLogo';

export default function LoginPage() {
  const { login, googleLogin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast.error(errorMessage(err, 'Login failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogleLogin = async () => {
    setGoogleSubmitting(true);
    try {
      const user = await googleLogin();
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast.error(errorMessage(err, 'Google sign-in failed'));
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to continue navigating your career." activeTab="login">
      <button
        type="button"
        onClick={onGoogleLogin}
        disabled={googleSubmitting}
        className="oauth-btn"
      >
        <GoogleGLogo />
        {googleSubmitting ? 'Signing in…' : 'Continue with Google'}
      </button>

      <div className="auth-divider my-6 text-center">
        <span>or log in with email</span>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-faint mb-1">Email address</label>
          <Input
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-faint mb-1">Password</label>
          <PasswordInput
            name="password"
            value={form.password}
            onChange={onChange}
            placeholder="••••••••"
            required
          />
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="rounded text-xs font-medium text-brand hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={submitting}>
          Log in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New to PathPilot?{' '}
        <Link to="/register" className="rounded font-semibold text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
