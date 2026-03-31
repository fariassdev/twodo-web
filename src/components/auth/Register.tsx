import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useSignUpMutation } from '../../lib/queryHooks';
import { registerSchema, type RegisterFormValues } from '../../lib/schemas';
import Button from '../ui/Button';
import Card from '../ui/Card';
import ErrorBanner from '../ui/ErrorBanner';
import FormField from '../ui/FormField';
import TextInput from '../ui/TextInput';

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const signUpMutation = useSignUpMutation();

  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const loading = signUpMutation.isPending;

  async function onSubmit(data: RegisterFormValues) {
    setServerError(null);
    try {
      await signUpMutation.mutateAsync({ email: data.email.trim(), password: data.password });
      navigate({ to: '/auth/verify-email', search: { email: data.email.trim() } });
    } catch {
      setServerError(t('auth.register.error'));
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md shadow-xl" padding="xl" variant="surface">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-100">{t('auth.register.title')}</h1>
          <p className="mt-2 text-sm text-slate-400">{t('auth.register.subtitle')}</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <FormField error={errors.email ? t(errors.email.message!) : null} htmlFor="register-email" label={t('auth.email')}>
            <TextInput
              autoComplete="email"
              id="register-email"
              placeholder={t('auth.emailPlaceholder')}
              type="email"
              {...register('email')}
            />
          </FormField>

          <FormField error={errors.password ? t(errors.password.message!) : null} htmlFor="register-password" label={t('auth.password')}>
            <TextInput
              autoComplete="new-password"
              id="register-password"
              placeholder={t('auth.passwordPlaceholder')}
              type="password"
              {...register('password')}
            />
          </FormField>

          <FormField
            error={errors.confirmPassword ? t(errors.confirmPassword.message!) : null}
            htmlFor="register-confirm-password"
            label={t('auth.confirmPassword')}
          >
            <TextInput
              autoComplete="new-password"
              id="register-confirm-password"
              placeholder={t('auth.confirmPasswordPlaceholder')}
              type="password"
              {...register('confirmPassword')}
            />
          </FormField>

          {serverError && (
            <ErrorBanner message={serverError} />
          )}

          <Button fullWidth loading={loading} type="submit">
            {t('auth.register.cta')}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          {t('auth.register.hasAccount')}{' '}
          <Link to="/auth/login" className="font-semibold text-primary hover:text-primary/80">
            {t('auth.register.goLogin')}
          </Link>
        </p>
      </Card>
    </div>
  );
}
