import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useLogin } from '../../../api/auth';
import { loginSchema, type LoginFormValues } from '../../../helpers/schemas';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import ErrorBanner from '../../ui/ErrorBanner';
import FormField from '../../ui/FormField';
import TextInput from '../../ui/TextInput';
import TwodoLogo from '../../ui/TwodoLogo';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const loginMutation = useLogin();

  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const loading = loginMutation.isPending;

  async function onSubmit(data: LoginFormValues) {
    setServerError(null);
    try {
      await loginMutation.mutateAsync({ email: data.email.trim(), password: data.password });
      navigate({ to: '/' });
    } catch {
      setServerError(t('auth.login.error'));
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md shadow-xl" padding="xl" variant="surface">
        <div className="mb-6 text-center">
          <TwodoLogo width={180} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-surface-2">{t('auth.login.title')}</h1>
          <p className="mt-2 text-sm text-surface-2/60">{t('auth.login.subtitle')}</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <FormField error={errors.email ? t(errors.email.message!) : null} htmlFor="login-email" label={t('auth.email')}>
            <TextInput
              autoComplete="email"
              id="login-email"
              placeholder={t('auth.emailPlaceholder')}
              type="email"
              {...register('email')}
            />
          </FormField>

          <FormField error={errors.password ? t(errors.password.message!) : null} htmlFor="login-password" label={t('auth.password')}>
            <TextInput
              autoComplete="current-password"
              id="login-password"
              placeholder={t('auth.passwordPlaceholder')}
              type="password"
              {...register('password')}
            />
          </FormField>

          {serverError && (
            <ErrorBanner message={serverError} />
          )}

          <Button fullWidth loading={loading} type="submit">
            {t('auth.login.cta')}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-surface-2/60">
          {t('auth.login.noAccount')}{' '}
          <Link to="/auth/register" className="font-semibold text-primary hover:text-primary/80">
            {t('auth.login.goRegister')}
          </Link>
        </p>

        <p className="mt-3 text-center text-sm text-surface-2/60">
          <Link to="/auth/forgot-password" className="font-semibold text-primary hover:text-primary/80">
            {t('auth.login.forgotPassword')}
          </Link>
        </p>
      </Card>
    </div>
  );
}
