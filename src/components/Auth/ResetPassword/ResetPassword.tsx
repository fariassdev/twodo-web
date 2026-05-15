import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../lib/supabase';
import { useUpdatePassword } from '../../../api/auth';
import { resetPasswordSchema, type ResetPasswordFormValues } from '../../../domain/schemas';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import ErrorBanner from '../../ui/ErrorBanner';
import FormField from '../../ui/FormField';
import TextInput from '../../ui/TextInput';
import TwodoLogo from '../../ui/TwodoLogo';

type PageState = 'loading' | 'ready' | 'expired' | 'success';

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const updateMutation = useUpdatePassword();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

  const loading = updateMutation.isPending;

  useEffect(() => {
    // Check if there's already an active session (code was exchanged)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setPageState('ready');
      }
    });

    // Listen for PASSWORD_RECOVERY event in case the code exchange happens after mount
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPageState('ready');
      }
    });

    // Show expired state after a timeout if nothing happens
    const timeout = setTimeout(() => {
      setPageState((prev) => (prev === 'loading' ? 'expired' : prev));
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function onSubmit(data: ResetPasswordFormValues) {
    setServerError(null);
    try {
      await updateMutation.mutateAsync(data.password);
      setPageState('success');
      setTimeout(() => {
        void navigate({ to: '/auth/login' });
      }, 2000);
    } catch {
      setServerError(t('auth.resetPassword.error'));
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md shadow-xl" padding="xl" variant="surface">
        <div className="mb-6 text-center">
          <TwodoLogo width={180} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-surface-2">{t('auth.resetPassword.title')}</h1>
          <p className="mt-2 text-sm text-surface-2/60">{t('auth.resetPassword.description')}</p>
        </div>

        {pageState === 'loading' && (
          <div className="py-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        )}

        {pageState === 'expired' && (
          <div className="space-y-6 text-center">
            <Card padding="md" variant="error">
              <p className="text-sm font-semibold text-danger mb-1">{t('auth.resetPassword.expiredTitle')}</p>
              <p className="text-sm text-surface-2/70">{t('auth.resetPassword.expiredDescription')}</p>
            </Card>
            <Link
              to="/auth/forgot-password"
              className="block w-full"
            >
              <Button fullWidth>{t('auth.resetPassword.requestNew')}</Button>
            </Link>
          </div>
        )}

        {pageState === 'success' && (
          <div className="py-6">
            <Card padding="md" variant="info" className="text-center">
              <p className="text-sm font-semibold text-primary mb-1">{t('auth.resetPassword.successTitle')}</p>
              <p className="text-sm text-surface-2/70">{t('auth.resetPassword.successDescription')}</p>
            </Card>
          </div>
        )}

        {pageState === 'ready' && (
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <FormField error={errors.password ? t(errors.password.message!) : null} htmlFor="reset-password" label={t('auth.password')}>
              <TextInput
                autoComplete="new-password"
                id="reset-password"
                placeholder={t('auth.passwordPlaceholder')}
                type="password"
                {...register('password')}
              />
            </FormField>

            <FormField
              error={errors.confirmPassword ? t(errors.confirmPassword.message!) : null}
              htmlFor="reset-confirm-password"
              label={t('auth.confirmPassword')}
            >
              <TextInput
                autoComplete="new-password"
                id="reset-confirm-password"
                placeholder={t('auth.confirmPasswordPlaceholder')}
                type="password"
                {...register('confirmPassword')}
              />
            </FormField>

            {serverError && (
              <ErrorBanner message={serverError} />
            )}

            <Button fullWidth loading={loading} type="submit">
              {t('auth.resetPassword.cta')}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

