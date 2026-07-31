import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input, PasswordInput } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { errorMessage } from '@/lib/api';
import { GoogleGLogoMono } from '@/components/ui/GoogleLogo';

/** Scores a password 0-4 based on length and character variety, for the strength bar. */
function scorePassword(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const STRENGTH_LEVELS = [
  { label: 'Too weak', color: '#EF4444' },
  { label: 'Weak', color: '#F59E0B' },
  { label: 'Fair', color: '#10B981' },
  { label: 'Good', color: '#34D399' },
  { label: 'Strong', color: '#34D399' },
];

function PasswordStrengthBar({ password }) {
  if (!password) return null;
  const score = scorePassword(password);
  const level = STRENGTH_LEVELS[score];

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors duration-300"
            style={{ backgroundColor: i < score ? level.color : 'rgba(255,255,255,0.12)' }}
          />
        ))}
      </div>
      <p className="mt-1 text-[11px] font-medium" style={{ color: level.color }}>{level.label}</p>
    </div>
  );
}

export default function RegisterPage() {
  const { register, googleLogin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onGoogleLogin = async () => {
    setGoogleSubmitting(true);
    try {
      await googleLogin();
      toast.success('Account ready! Let\'s get you set up.');
      navigate('/onboarding', { replace: true });
    } catch (err) {
      toast.error(errorMessage(err, 'Google sign-in failed'));
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Please enter your full name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email';
    if (form.password.length < 8) next.password = 'At least 8 characters';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success('Account created! Check your email to verify.');
      navigate('/onboarding', { replace: true });
    } catch (err) {
      toast.error(errorMessage(err, 'Registration failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Start building your path to job-ready." activeTab="register">
      <button
        type="button"
        onClick={onGoogleLogin}
        disabled={googleSubmitting}
        className="oauth-btn-mono hud-focus"
      >
        <GoogleGLogoMono />
        {googleSubmitting ? 'Signing in…' : 'Continue with Google'}
      </button>

      <div className="auth-divider my-6 text-center">
        <span>or create with email</span>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label="Full name"
          name="name"
          placeholder="Enter your full name"
          value={form.name}
          onChange={onChange}
          error={errors.name}
          required
        />
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          value={form.email}
          onChange={onChange}
          error={errors.email}
          required
        />
        <div>
          <PasswordInput
            label="Password"
            name="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={onChange}
            error={errors.password}
            hint={!errors.password ? 'Use 8+ characters with a mix of letters & numbers.' : undefined}
            required
          />
          <PasswordStrengthBar password={form.password} />
        </div>

        <Button
          type="submit"
          className="w-full hud-focus focus-visible:!ring-[#34D399]/40 !bg-[#34D399] !text-[#0A0D12] hover:!bg-[#2BBF89] shadow-[0_0_20px_-4px_#34D399]"
          size="lg"
          loading={submitting}
        >
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-white/60">
        Already have an account?{' '}
        <Link to="/login" className="hud-focus rounded font-semibold text-[#34D399] hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
