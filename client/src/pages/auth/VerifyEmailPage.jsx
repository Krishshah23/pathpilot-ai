import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SimpleAuthLayout } from '@/components/layout/SimpleAuthLayout';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { api, errorMessage } from '@/lib/api';

const MINT_BTN = '!bg-[#34D399] !text-[#0A0D12] hover:!bg-[#2BBF89] shadow-[0_0_20px_-4px_#34D399] hud-focus focus-visible:!ring-[#34D399]/40';

/** Verifies the email token from the link, then reflects the result. */
export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { refreshUser, isAuthenticated } = useAuth();
  const [status, setStatus] = useState(token ? 'verifying' : 'invalid'); // verifying|success|error|invalid
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true; // guard against StrictMode double-invoke
    (async () => {
      try {
        await api.post('/auth/verify-email', { token });
        setStatus('success');
        if (isAuthenticated) await refreshUser().catch(() => {});
      } catch (err) {
        setStatus('error');
        setMessage(errorMessage(err, 'Verification failed'));
      }
    })();
  }, [token, isAuthenticated, refreshUser]);

  const CONTENT = {
    verifying: {
      icon: <Spinner className="h-6 w-6 text-[#34D399]" />,
      title: 'Verifying your email…',
      body: 'Hang tight, this only takes a second.',
    },
    success: {
      icon: '✓',
      title: 'Email verified!',
      body: 'Your account is now fully activated.',
    },
    error: {
      icon: '✕',
      title: 'Verification failed',
      body: message || 'This link may have expired.',
    },
    invalid: {
      icon: '!',
      title: 'Missing token',
      body: 'This verification link is incomplete.',
    },
  }[status];

  return (
    <SimpleAuthLayout title="Email verification" subtitle="Confirming your PathPilot account.">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#34D399] text-2xl text-[#0A0D12]">
          {CONTENT.icon}
        </div>
        <h3 className="font-display text-lg font-bold text-white">{CONTENT.title}</h3>
        <p className="mt-1 text-sm text-white/60">{CONTENT.body}</p>

        <div className="mt-6">
          <Link to={isAuthenticated ? '/dashboard' : '/login'}>
            <Button className={`w-full ${MINT_BTN}`}>
              {isAuthenticated ? 'Go to dashboard' : 'Continue to login'}
            </Button>
          </Link>
        </div>
      </div>
    </SimpleAuthLayout>
  );
}
