import { useTranslation } from 'react-i18next';
import { useAuthScope, useSignOutMutation } from '../../lib/queryHooks';

export default function PendingAccess() {
  const { t } = useTranslation();
  const { status } = useAuthScope();
  const signOutMutation = useSignOutMutation();

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
      <div className="w-full max-w-md rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-slate-100">{t('auth.pending.title')}</h1>
        <p className="mt-3 text-sm text-slate-300">{t('auth.pending.description')}</p>
        <p className="mt-3 rounded-xl border border-primary/20 bg-background-dark/40 px-3 py-2 text-sm text-primary">
          {pendingReason}
        </p>

        <button
          type="button"
          className="mt-6 h-11 w-full rounded-xl border border-primary/40 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleSignOut}
          disabled={loading}
        >
          {loading ? t('auth.loading') : t('auth.pending.signOut')}
        </button>
      </div>
    </div>
  );
}
