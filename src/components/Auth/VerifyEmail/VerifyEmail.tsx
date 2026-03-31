import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useResendVerificationMutation, useSignOutMutation } from '../../../lib/queryHooks';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import ErrorBanner from '../../ui/ErrorBanner';

interface VerifyEmailProps {
  email?: string;
}

export default function VerifyEmail({ email }: VerifyEmailProps) {
  const { t } = useTranslation();
  const resendMutation = useResendVerificationMutation();
  const signOutMutation = useSignOutMutation();

  const [resendError, setResendError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  async function handleResend() {
    if (!email) return;
    setResendError(null);
    setResendSuccess(false);
    try {
      await resendMutation.mutateAsync({ email });
      setResendSuccess(true);
    } catch {
      setResendError(t('auth.verifyEmail.resendError'));
    }
  }

  async function handleSignOut() {
    try {
      await signOutMutation.mutateAsync();
    } catch {
      // Silently ignore
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-5 pt-12 pb-8 bg-background-dark">
      <div className="flex items-center gap-2 mb-8">
        <Button className="gap-2 text-sm text-slate-400 hover:text-slate-200" onClick={handleSignOut} size="sm" variant="ghost">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-semibold">couple-organizer</span>
        </Button>
      </div>

      <div className="mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-slate-100 mb-3">{t('auth.verifyEmail.title')}</h1>
        {email ? (
          <p className="text-sm text-slate-400 leading-relaxed">
            {t('auth.verifyEmail.descriptionWithEmail', { email })}
          </p>
        ) : (
          <p className="text-sm text-slate-400 leading-relaxed">{t('auth.verifyEmail.description')}</p>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-4">
        <Card padding="md" radius="2xl" variant="surface">
          <p className="text-sm text-slate-300 leading-relaxed">{t('auth.verifyEmail.hint')}</p>
        </Card>

        {resendSuccess && (
          <ErrorBanner message={t('auth.verifyEmail.resendSuccess')} tone="success" />
        )}

        {resendError && (
          <ErrorBanner message={resendError} />
        )}

        {email && (
          <Button
            disabled={resendMutation.isPending}
            onClick={handleResend}
            fullWidth
            size="lg"
            variant="subtle"
          >
            {resendMutation.isPending ? t('auth.loading') : t('auth.verifyEmail.resend')}
          </Button>
        )}

        <p className="mt-auto text-center text-sm text-slate-400">
          {t('auth.verifyEmail.wrongAccount')}{' '}
          <Link to="/auth/login" className="font-semibold text-primary hover:text-primary/80" onClick={handleSignOut}>
            {t('auth.verifyEmail.signOut')}
          </Link>
        </p>
      </div>
    </div>
  );
}
