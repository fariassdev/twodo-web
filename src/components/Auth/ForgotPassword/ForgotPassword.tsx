import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useForgotPassword } from '../../../api/auth';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '../../../helpers/schemas';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import ErrorBanner from '../../ui/ErrorBanner';
import FormField from '../../ui/FormField';
import TextInput from '../../ui/TextInput';
import TwodoLogo from '../../ui/TwodoLogo';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const forgotMutation = useForgotPassword();

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
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md shadow-xl" padding="xl" variant="surface">
        <div className="mb-6 text-center">
          <TwodoLogo width={180} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-surface-2">{t('auth.forgotPassword.title')}</h1>
          <p className="mt-2 text-sm text-surface-2/60">{t('auth.forgotPassword.description')}</p>
        </div>

        {sent ? (
          <div className="space-y-6 text-center">
            <Card padding="md" variant="info">
              <p className="text-sm font-semibold text-primary mb-1">{t('auth.forgotPassword.sentTitle')}</p>
              <p className="text-sm text-surface-2/70">{t('auth.forgotPassword.sentDescription', { email: getValues('email') })}</p>
            </Card>
            <Link
              to="/auth/login"
              className="inline-block text-sm font-semibold text-primary hover:text-primary/80"
            >
              {t('auth.forgotPassword.backToLogin')}
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <FormField error={errors.email ? t(errors.email.message!) : null} htmlFor="forgot-password-email" label={t('auth.email')}>
              <TextInput
                autoComplete="email"
                id="forgot-password-email"
                placeholder={t('auth.emailPlaceholder')}
                type="email"
                {...register('email')}
              />
            </FormField>

            {serverError && (
              <ErrorBanner message={serverError} />
            )}

            <Button fullWidth loading={loading} type="submit">
              {t('auth.forgotPassword.cta')}
            </Button>

            <p className="mt-6 text-center text-sm text-surface-2/60">
              {t('auth.forgotPassword.rememberPassword')}{' '}
              <Link to="/auth/login" className="font-semibold text-primary hover:text-primary/80">
                {t('auth.forgotPassword.signIn')}
              </Link>
            </p>
          </form>
        )}
      </Card>
    </div>
  );
}

