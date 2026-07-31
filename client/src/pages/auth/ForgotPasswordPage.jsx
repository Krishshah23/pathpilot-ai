import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SimpleAuthLayout } from '@/components/layout/SimpleAuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import { api, errorMessage } from '@/lib/api';

const MINT_BTN = '!bg-[#34D399] !text-[#0A0D12] hover:!bg-[#2BBF89] shadow-[0_0_20px_-4px_#34D399] hud-focus focus-visible:!ring-[#34D399]/40';

export default function ForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <SimpleAuthLayout title="Check your inbox" subtitle="We've sent you a password reset link.">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#34D399] text-xl text-[#0A0D12]">
            ✉
          </div>
          <p className="text-sm text-white/60">
            If an account exists for <span className="font-medium text-white">{email}</span>, a reset
            link is on its way. It expires in 1 hour.
          </p>
        </div>
        <p className="mt-6 text-center text-sm text-white/60">
          <Link to="/login" className="hud-focus rounded font-semibold text-[#34D399] hover:underline">
            Back to login
          </Link>
        </p>
      </SimpleAuthLayout>
    );
  }

  return (
    <SimpleAuthLayout title="Forgot password?" subtitle="Enter your email and we'll send a reset link.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@college.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" className={`w-full ${MINT_BTN}`} size="lg" loading={submitting}>
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-white/60">
        Remembered it?{' '}
        <Link to="/login" className="hud-focus rounded font-semibold text-[#34D399] hover:underline">
          Back to login
        </Link>
      </p>
    </SimpleAuthLayout>
  );
}
