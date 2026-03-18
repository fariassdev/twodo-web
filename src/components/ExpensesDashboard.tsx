import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import TopBar from './ui/TopBar';
import DataStatusBanner from './ui/DataStatusBanner';
import QueryErrorState from './ui/QueryErrorState';
import ExpensesList from './expenses/ExpensesList';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { centsToCurrency } from '../lib/expenseUtils';
import {
  useAuthScope,
  useCreateSettlementMutation,
  useExpensesActivityFeedInfiniteQuery,
  useExpensesDashboardQuery,
} from '../lib/queryHooks';
import { settlementFormSchema, type SettlementFormValues } from '../lib/schemas';

export default function ExpensesDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const { profileId } = useAuthScope();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementFormSchema),
    defaultValues: { note: '' },
  });

  const dashboardQuery = useExpensesDashboardQuery();
  const activityQuery = useExpensesActivityFeedInfiniteQuery(20);
  const createSettlementMutation = useCreateSettlementMutation();

  const [isSettlementSheetOpen, setSettlementSheetOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const dashboardData = dashboardQuery.data;
  const balance = dashboardData?.balance;
  const activityItems = useMemo(
    () => activityQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [activityQuery.data],
  );

  const isFetching = dashboardQuery.isFetching || activityQuery.isFetching;
  const isStale = dashboardQuery.isStale || activityQuery.isStale;

  const amountLabel = centsToCurrency(balance?.amountCents ?? 0, i18n.language);
  const counterpartyName = balance?.counterpartyProfile?.name ?? t('expenses.partnerFallback');

  const balanceHeadline =
    balance?.direction === 'you_are_owed'
      ? t('expenses.balance.theyOweYou', { name: counterpartyName })
      : balance?.direction === 'you_owe'
        ? t('expenses.balance.youOwe', { name: counterpartyName })
        : t('expenses.balance.settled');

  const canSettle = balance?.direction === 'you_owe' && balance.amountCents > 0;

  const handleConfirmSettlement = handleSubmit(async ({ note }) => {
    if (!canSettle) return;

    setActionError(null);
    try {
      await createSettlementMutation.mutateAsync({ note });
      setSettlementSheetOpen(false);
      reset({ note: '' });
    } catch (error) {
      console.error('Settlement error:', error);
      setActionError(t('queryState.mutationError'));
    }
  });

  function retryQuery() {
    void Promise.all([dashboardQuery.refetch(), activityQuery.refetch()]);
  }

  if (dashboardQuery.isPending || activityQuery.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if ((dashboardQuery.isError && !dashboardData) || (activityQuery.isError && activityItems.length === 0)) {
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
              {balance?.direction === 'you_are_owed'
                ? t('expenses.settlement.confirmReceipt', { amount: amountLabel, name: counterpartyName })
                : t('expenses.settlement.confirmTransfer', { amount: amountLabel, name: counterpartyName })}
            </p>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t('expenses.settlement.noteOptional')}
            </label>
            <input
              className="mt-2 h-12 w-full rounded-xl border border-primary/20 bg-primary/5 px-4 text-sm text-slate-100 placeholder:text-slate-500"
              maxLength={200}
              placeholder={t('expenses.settlement.notePlaceholder')}
              {...register('note')}
            />
            {errors.note && <p className="mt-2 text-xs text-red-400">{t(errors.note.message!)}</p>}

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
        rightSlot={(
          <button
            aria-label={t('expenses.openSearch')}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-100 transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
            onClick={() => navigate({ to: '/expenses/list' })}
            type="button"
          >
            <span className="material-symbols-outlined">search</span>
          </button>
        )}
      />

      <main className="mx-auto max-w-md px-4 pt-5">
        <DataStatusBanner isOffline={!isOnline} isStale={isStale} isFetching={isFetching} />

        {actionError && (
          <p className="mb-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-100">
            {actionError}
          </p>
        )}

        <section className="relative overflow-hidden rounded-[2.5rem] bg-[#102620] p-7 shadow-2xl shadow-black/40 border border-primary/10">
          <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-10 -right-6 opacity-[0.07] pointer-events-none">
            <span className="material-symbols-outlined !text-[12rem] select-none">
              {balance?.direction === 'settled' ? 'check_circle' : 'account_balance_wallet'}
            </span>
          </div>

          <div className="relative z-10">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-primary/60">
              {t('expenses.currentBalance')}
            </p>
            <h2 className={`mt-1 text-3xl font-extrabold leading-tight text-white`}>
              {balanceHeadline}
            </h2>

            <p className={`mt-2 text-4xl font-black ${balance?.direction === 'settled' ? 'text-slate-400' : 'text-primary'}`}>
              {amountLabel}
            </p>

            {balance?.direction !== 'settled' && (
              <button
                className="mt-8 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-primary text-xl font-bold text-[#102620] shadow-lg shadow-primary/20 transition-transform active:scale-[0.98]"
                onClick={() => setSettlementSheetOpen(true)}
                type="button"
              >
                <span className="material-symbols-outlined filled-icon">payments</span>
                {t('expenses.settleUp')}
              </button>
            )}

            {balance?.direction === 'settled' && (
              <div className="mt-4 flex items-center gap-2 text-sm font-bold text-primary/80">
                <span className="material-symbols-outlined !text-lg">done_all</span>
                {t('expenses.balance.settledSubtitle')}
              </div>
            )}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-4xl font-bold tracking-tight text-slate-100">{t('expenses.historyTitle')}</h3>

          </div>

          {activityItems.length === 0 ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center text-sm text-slate-300">
              {t('expenses.emptyFirstExpense')}
            </div>
          ) : (
            <ExpensesList
              currentProfileId={profileId}
              hasNextPage={activityQuery.hasNextPage}
              isFetchingNextPage={activityQuery.isFetchingNextPage}
              items={activityItems}
              locale={i18n.language}
              onLoadMore={() => {
                if (activityQuery.hasNextPage && !activityQuery.isFetchingNextPage) {
                  void activityQuery.fetchNextPage();
                }
              }}
              onExpenseClick={(expenseId) =>
                navigate({
                  to: '/expenses/$expenseId',
                  params: { expenseId },
                  search: { from: 'dashboard' },
                })
              }
            />
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
