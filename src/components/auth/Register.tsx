import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useSignUpMutation } from '../../lib/queryHooks';

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const signUpMutation = useSignUpMutation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const loading = signUpMutation.isPending;

  function validateForm() {
    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password.trim() || !confirmPassword.trim()) {
      setFormError(t('auth.validation.requiredFields'));
      return false;
    }

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setFormError(t('auth.validation.invalidEmail'));
      return false;
    }

    if (password.length < 8) {
      setFormError(t('auth.validation.passwordMinLength'));
      return false;
    }

    if (password !== confirmPassword) {
      setFormError(t('auth.validation.passwordMismatch'));
      return false;
    }

    setFormError(null);
    return true;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await signUpMutation.mutateAsync({
        email: email.trim(),
        password,
      });
      navigate({ to: '/pending-access' });
    } catch {
      setFormError(t('auth.register.error'));
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-100">{t('auth.register.title')}</h1>
          <p className="mt-2 text-sm text-slate-400">{t('auth.register.subtitle')}</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-200">{t('auth.email')}</span>
            <input
              className="h-12 rounded-xl border border-primary/20 bg-background-dark px-4 text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t('auth.emailPlaceholder')}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-200">{t('auth.password')}</span>
            <input
              className="h-12 rounded-xl border border-primary/20 bg-background-dark px-4 text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-200">{t('auth.confirmPassword')}</span>
            <input
              className="h-12 rounded-xl border border-primary/20 bg-background-dark px-4 text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder={t('auth.confirmPasswordPlaceholder')}
            />
          </label>

          {formError && (
            <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-100">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-primary font-bold text-background-dark transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? t('auth.loading') : t('auth.register.cta')}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          {t('auth.register.hasAccount')}{' '}
          <Link to="/auth/login" className="font-semibold text-primary hover:text-primary/80">
            {t('auth.register.goLogin')}
          </Link>
        </p>
      </div>
    </div>
  );
}
