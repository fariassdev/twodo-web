import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useForgotPasswordMutation } from '../../lib/queryHooks';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '../../lib/schemas';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const forgotMutation = useForgotPasswordMutation();

  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const loading = forgotMutation.isPending;

  async function onSubmit(data: ForgotPasswordFormValues) {
    setServerError(null);
    try {
      await forgotMutation.mutateAsync({ email: data.email.trim() });
      setSent(true);
    } catch {
      setServerError(t('auth.forgotPassword.error'));
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-slate-100 mb-3">{t('auth.forgotPassword.title')}</h1>
        <p className="text-sm text-slate-400 leading-relaxed">{t('auth.forgotPassword.description')}</p>
      </div>

      {sent ? (
        <div className="flex-1 flex flex-col">
          <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-5 mb-6">
            <p className="text-sm font-semibold text-primary mb-1">{t('auth.forgotPassword.sentTitle')}</p>
            <p className="text-sm text-slate-300">{t('auth.forgotPassword.sentDescription', { email: getValues('email') })}</p>
          </div>
          <Link
            to="/auth/login"
            className="text-center text-sm font-semibold text-primary hover:text-primary/80"
          >
            {t('auth.forgotPassword.backToLogin')}
          </Link>
        </div>
      ) : (
        <form className="flex-1 flex flex-col" onSubmit={handleSubmit(onSubmit)}>
          <label className="flex flex-col gap-2 mb-4">
            <span className="text-sm font-semibold text-slate-200">{t('auth.emailLabel')}</span>
            <div className="flex items-center h-14 rounded-2xl border border-primary/20 bg-slate-800/60 px-4 gap-3 focus-within:ring-1 focus-within:ring-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <input
                className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none"
                type="email"
                autoComplete="email"
                placeholder={t('auth.emailPlaceholder')}
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="text-xs font-medium text-rose-300">{t(errors.email.message!)}</p>
            )}
          </label>

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
            {loading ? t('auth.loading') : t('auth.forgotPassword.cta')}
          </button>

          <p className="mt-auto pt-8 text-center text-sm text-slate-400">
            {t('auth.forgotPassword.rememberPassword')}{' '}
            <Link to="/auth/login" className="font-semibold text-primary hover:text-primary/80">
              {t('auth.forgotPassword.signIn')}
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
