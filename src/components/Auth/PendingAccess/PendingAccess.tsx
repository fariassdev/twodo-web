import { useTranslation } from 'react-i18next';
import { useAuthScope, useSignOutMutation } from '../../../lib/queryHooks';
import ConnectPartner from '../../ConnectPartner';
import TwodoLogo from '../../ui/TwodoLogo';
import Button from '../../ui/Button';
import Card from '../../ui/Card';

export default function PendingAccess() {
  const { t } = useTranslation();
  const { status } = useAuthScope();
  const signOutMutation = useSignOutMutation();

  // Delegate to ConnectPartner for pending_household status
  if (status === 'pending_household') {
    return <ConnectPartner />;
  }

  const loading = signOutMutation.isPending;
  const pendingReason = status === 'pending_profile'
    ? t('auth.pending.reasonProfile')
    : t('auth.pending.reasonHousehold');

  async function handleSignOut() {
    try {
      await signOutMutation.mutateAsync();
    } catch {
      // Keeping this intentionally silent because retry remains available in UI.
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md shadow-xl" padding="xl" radius="2xl" variant="surface">
        <TwodoLogo width={180} className="mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-surface-2">{t('auth.pending.title')}</h1>
        <p className="mt-3 text-sm text-surface-2/60">{t('auth.pending.description')}</p>
        <p className="mt-3 rounded-xl border border-primary/20 bg-surface-2/10 px-3 py-2 text-sm text-primary">
          {pendingReason}
        </p>

        <Button
          className="mt-6 border-primary/40 text-sm font-semibold text-primary"
          onClick={handleSignOut}
          disabled={loading}
          fullWidth
          variant="subtle"
        >
          {loading ? t('auth.loading') : t('auth.pending.signOut')}
        </Button>
      </Card>
    </div>
  );
}
