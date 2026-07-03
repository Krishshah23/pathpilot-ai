import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PasswordInput } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import { api, errorMessage } from '@/lib/api';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return setError('At least 8 characters');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    setError('');
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, password: form.password });
      toast.success('Password reset. Please log in.');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(errorMessage(err, 'Reset failed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Invalid link" subtitle="This reset link is missing or malformed.">
        <p className="text-sm text-muted">
          Please request a new link from the{' '}
          <Link to="/forgot-password" className="font-semibold text-brand-soft hover:underline">
            forgot password
          </Link>{' '}
          page.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a strong password you'll remember.">
      <form onSubmit={onSubmit} className="space-y-4">
        <PasswordInput
          label="New password"
          name="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          required
        />
        <PasswordInput
          label="Confirm password"
          name="confirm"
          autoComplete="new-password"
          placeholder="Re-enter password"
          value={form.confirm}
          onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
          error={error}
          required
        />
        <Button type="submit" className="w-full" size="lg" loading={submitting}>
          Reset password
        </Button>
      </form>
    </AuthLayout>
  );
}
