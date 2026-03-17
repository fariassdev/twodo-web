import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useUpdatePasswordMutation } from '../../lib/queryHooks';
import { resetPasswordSchema, type ResetPasswordFormValues } from '../../lib/schemas';

type PageState = 'loading' | 'ready' | 'expired' | 'success';

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const updateMutation = useUpdatePasswordMutation();

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
      await updateMutation.mutateAsync({ password: data.password });
      setPageState('success');
      setTimeout(() => {
        void navigate({ to: '/auth/login' });
      }, 2000);
    } catch {
      setServerError(t('auth.resetPassword.error'));
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-5 pt-12 pb-8 bg-background-dark">
      <Link
        to="/auth/login"
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 mb-8 self-start"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <span className="font-semibold">couple-organizer</span>
      </Link>

      <div className="mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-slate-100 mb-3">{t('auth.resetPassword.title')}</h1>
        <p className="text-sm text-slate-400 leading-relaxed">{t('auth.resetPassword.description')}</p>
      </div>

      {pageState === 'loading' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      )}

      {pageState === 'expired' && (
        <div className="flex-1 flex flex-col">
          <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-5 mb-6">
            <p className="text-sm font-semibold text-rose-200 mb-1">{t('auth.resetPassword.expiredTitle')}</p>
            <p className="text-sm text-slate-300">{t('auth.resetPassword.expiredDescription')}</p>
          </div>
          <Link
            to="/auth/forgot-password"
            className="h-14 flex items-center justify-center rounded-2xl bg-primary font-bold text-background-dark text-base transition-colors hover:bg-primary/90"
          >
            {t('auth.resetPassword.requestNew')}
          </Link>
        </div>
      )}

      {pageState === 'success' && (
        <div className="flex-1 flex flex-col">
          <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-5 mb-6">
            <p className="text-sm font-semibold text-primary mb-1">{t('auth.resetPassword.successTitle')}</p>
            <p className="text-sm text-slate-300">{t('auth.resetPassword.successDescription')}</p>
          </div>
        </div>
      )}

      {pageState === 'ready' && (
        <form className="flex-1 flex flex-col" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 mb-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-200">{t('auth.password')}</span>
              <input
                className="h-14 rounded-2xl border border-primary/20 bg-slate-800/60 px-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary"
                type="password"
                autoComplete="new-password"
                placeholder={t('auth.passwordPlaceholder')}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs font-medium text-rose-300">{t(errors.password.message!)}</p>
              )}
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-200">{t('auth.confirmPassword')}</span>
              <input
                className="h-14 rounded-2xl border border-primary/20 bg-slate-800/60 px-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary"
                type="password"
                autoComplete="new-password"
                placeholder={t('auth.confirmPasswordPlaceholder')}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-xs font-medium text-rose-300">{t(errors.confirmPassword.message!)}</p>
              )}
            </label>
          </div>

          {serverError && (
            <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-100 mb-4">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-14 w-full rounded-2xl bg-primary font-bold text-background-dark text-base transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 mt-2"
          >
            {loading ? t('auth.loading') : t('auth.resetPassword.cta')}
          </button>
        </form>
      )}
    </div>
  );
}
