import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useSignInMutation } from '../../lib/queryHooks';
import { loginSchema, type LoginFormValues } from '../../lib/schemas';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const signInMutation = useSignInMutation();

  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const loading = signInMutation.isPending;

  async function onSubmit(data: LoginFormValues) {
    setServerError(null);
    try {
      await signInMutation.mutateAsync({ email: data.email.trim(), password: data.password });
      navigate({ to: '/' });
    } catch {
      setServerError(t('auth.login.error'));
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-100">{t('auth.login.title')}</h1>
          <p className="mt-2 text-sm text-slate-400">{t('auth.login.subtitle')}</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-200">{t('auth.email')}</span>
            <input
              className="h-12 rounded-xl border border-primary/20 bg-background-dark px-4 text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
              type="email"
              autoComplete="email"
              placeholder={t('auth.emailPlaceholder')}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs font-medium text-rose-300">{t(errors.email.message!)}</p>
            )}
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-200">{t('auth.password')}</span>
            <input
              className="h-12 rounded-xl border border-primary/20 bg-background-dark px-4 text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
              type="password"
              autoComplete="current-password"
              placeholder={t('auth.passwordPlaceholder')}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs font-medium text-rose-300">{t(errors.password.message!)}</p>
            )}
          </label>

          {serverError && (
            <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-100">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-primary font-bold text-background-dark transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? t('auth.loading') : t('auth.login.cta')}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          {t('auth.login.noAccount')}{' '}
          <Link to="/auth/register" className="font-semibold text-primary hover:text-primary/80">
            {t('auth.login.goRegister')}
          </Link>
        </p>

        <p className="mt-3 text-center text-sm text-slate-400">
          <Link to="/auth/forgot-password" className="font-semibold text-primary hover:text-primary/80">
            {t('auth.login.forgotPassword')}
          </Link>
        </p>
      </div>
    </div>
  );
}
