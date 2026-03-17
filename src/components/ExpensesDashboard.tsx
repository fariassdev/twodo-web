import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import TopBar from './ui/TopBar';
import DataStatusBanner from './ui/DataStatusBanner';
import QueryErrorState from './ui/QueryErrorState';
import ExpenseListItem from './expenses/ExpenseListItem';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { centsToCurrency } from '../lib/expenseUtils';
import { queryKeys } from '../lib/queryKeys';
import { useAuthScope, useCreateSettlementMutation, useExpensesDashboardQuery } from '../lib/queryHooks';

export default function ExpensesDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const { householdId, profileId } = useAuthScope();
  const dashboardQuery = useExpensesDashboardQuery();
  const createSettlementMutation = useCreateSettlementMutation();

  const [isSettlementSheetOpen, setSettlementSheetOpen] = useState(false);
  const [settlementNote, setSettlementNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const dashboardData = dashboardQuery.data;
  const balance = dashboardData?.balance;
  const recentExpenses = dashboardData?.recentExpenses ?? [];

  const isFetching = dashboardQuery.isFetching;
  const isStale = dashboardQuery.isStale;

  const amountLabel = centsToCurrency(balance?.amountCents ?? 0, i18n.language);
  const counterpartyName = balance?.counterpartyProfile?.name ?? t('expenses.partnerFallback');

  const balanceHeadline =
    balance?.direction === 'you_are_owed'
      ? t('expenses.balance.theyOweYou', { name: counterpartyName })
      : balance?.direction === 'you_owe'
        ? t('expenses.balance.youOwe', { name: counterpartyName })
        : t('expenses.balance.settled');

  const canSettle = balance?.direction === 'you_owe' && balance.amountCents > 0;

  async function handleConfirmSettlement() {
    if (!canSettle) return;

    setActionError(null);
    try {
      await createSettlementMutation.mutateAsync({ note: settlementNote });
      setSettlementSheetOpen(false);
      setSettlementNote('');
    } catch (error) {
      console.error('Settlement error:', error);
      setActionError(t('queryState.mutationError'));
    }
  }

  function retryQuery() {
    if (!householdId || !profileId) return;
    void queryClient.refetchQueries({ queryKey: queryKeys.expenses.dashboard(householdId, profileId) });
  }

  if (dashboardQuery.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (dashboardQuery.isError && !dashboardData) {
    return <QueryErrorState onRetry={retryQuery} />;
  }

  return (
    <div className="pb-28">
      {isSettlementSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
          <button
            aria-label={t('expenses.settlement.closeSheet')}
            className="absolute inset-0 bg-background-dark/80 backdrop-blur-sm"
            onClick={() => setSettlementSheetOpen(false)}
            type="button"
          />
          <div className="relative w-full max-w-md rounded-3xl border border-primary/20 bg-[#102620] p-5 shadow-2xl shadow-black/50">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-primary/40" />
            <h2 className="text-xl font-bold text-slate-100">{t('expenses.settlement.title')}</h2>
            <p className="mt-2 text-sm text-slate-300">
              {t('expenses.settlement.confirmTransfer', { amount: amountLabel, name: counterpartyName })}
            </p>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t('expenses.settlement.noteOptional')}
            </label>
            <input
              className="mt-2 h-12 w-full rounded-xl border border-primary/20 bg-primary/5 px-4 text-sm text-slate-100 placeholder:text-slate-500"
              placeholder={t('expenses.settlement.notePlaceholder')}
              value={settlementNote}
              onChange={(event) => setSettlementNote(event.target.value)}
            />

            <button
              className="mt-5 h-12 w-full rounded-2xl bg-primary text-lg font-bold text-background-dark shadow-lg shadow-primary/20 disabled:opacity-50"
              disabled={createSettlementMutation.isPending}
              onClick={handleConfirmSettlement}
              type="button"
            >
              {createSettlementMutation.isPending ? t('common.saving') : t('expenses.settlement.confirmButton')}
            </button>
            <button
              className="mt-2 h-12 w-full rounded-2xl border border-primary/20 text-sm font-semibold text-slate-300"
              onClick={() => setSettlementSheetOpen(false)}
              type="button"
            >
              {t('cta.cancel')}
            </button>
          </div>
        </div>
      )}

      <TopBar
        title={t('expenses.dashboardTitle')}
        titleIcon="payments"
        rightMenu={{
          ariaLabel: t('topBar.openMenu'),
          closeAriaLabel: t('topBar.closeMenu'),
          items: [
            {
              id: 'view-all-expenses',
              icon: 'receipt_long',
              label: t('expenses.viewAll'),
              onClick: () => navigate({ to: '/expenses/list' }),
            },
            {
              id: 'view-settlements',
              icon: 'history',
              label: t('expenses.settlementsTitle'),
              onClick: () => navigate({ to: '/expenses/settlements' }),
            },
          ],
        }}
      />

      <main className="mx-auto max-w-md px-4 pt-5">
        <DataStatusBanner isOffline={!isOnline} isStale={isStale} isFetching={isFetching} />

        {actionError && (
          <p className="mb-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-100">
            {actionError}
          </p>
        )}

        <section className="relative overflow-hidden rounded-[2rem] border border-primary/25 bg-gradient-to-br from-[#0f4539] to-[#0b251f] p-6 shadow-xl shadow-black/20">
          <div className="absolute -right-8 -top-12 h-36 w-36 rounded-full bg-primary/20 blur-2xl" />
          <p className="text-sm uppercase tracking-widest text-primary/80">{t('expenses.currentBalance')}</p>
          <h2 className="mt-2 text-5xl font-black leading-tight text-slate-100">{amountLabel}</h2>
          <p className="mt-2 text-3xl font-bold text-slate-100">{balanceHeadline}</p>

          {balance?.direction === 'you_owe' && (
            <button
              className="mt-6 h-14 w-full rounded-2xl bg-primary text-2xl font-bold text-background-dark shadow-lg shadow-primary/30"
              onClick={() => setSettlementSheetOpen(true)}
              type="button"
            >
              {t('expenses.settleUp')}
            </button>
          )}

          {balance?.direction === 'settled' && (
            <p className="mt-5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
              {t('expenses.balance.settledSubtitle')}
            </p>
          )}
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-4xl font-bold tracking-tight text-slate-100">{t('expenses.recentExpenses')}</h3>
            <button
              className="text-sm font-bold text-primary"
              onClick={() => navigate({ to: '/expenses/list' })}
              type="button"
            >
              {t('expenses.viewAll')}
            </button>
          </div>

          {recentExpenses.length === 0 ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center text-sm text-slate-300">
              {t('expenses.emptyFirstExpense')}
            </div>
          ) : (
            <div className="space-y-3">
              {recentExpenses.map((expense) => (
                <div key={expense.id}>
                  <ExpenseListItem
                    currentProfileId={profileId}
                    expense={expense}
                    locale={i18n.language}
                    onClick={() => navigate({ to: '/expenses/$expenseId', params: { expenseId: expense.id } })}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <button
        aria-label={t('expenses.newExpense')}
        className="fixed bottom-28 right-6 z-30 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-background-dark shadow-2xl shadow-primary/30"
        onClick={() => navigate({ to: '/expenses/new' })}
        type="button"
      >
        <span className="material-symbols-outlined text-4xl">add</span>
      </button>
    </div>
  );
}
