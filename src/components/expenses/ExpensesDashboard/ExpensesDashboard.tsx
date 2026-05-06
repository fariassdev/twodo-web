import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import PageHeader from '../../ui/PageHeader';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import DataStatusBanner from '../../ui/DataStatusBanner';
import ErrorBanner from '../../ui/ErrorBanner';
import FormField from '../../ui/FormField';
import Modal from '../../ui/Modal';
import QueryErrorState from '../../ui/QueryErrorState';
import TextInput from '../../ui/TextInput';
import ExpensesList from '../ExpensesList';
import { useOnlineStatus } from '../../../hooks/useOnlineStatus';
import { centsToCurrency } from '../../../helpers/expense';
import {
  useAuthScope,
  useCreateSettlementMutation,
  useExpensesActivityFeedInfiniteQuery,
  useExpensesDashboardQuery,
} from '../../../lib/queryHooks';
import { settlementFormSchema, type SettlementFormValues } from '../../../helpers/schemas';

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
    <div className="pb-28 bg-background-dark min-h-screen">
      <Modal
        className="items-end justify-center pb-6"
        onClose={() => setSettlementSheetOpen(false)}
        open={isSettlementSheetOpen}
        overlayAriaLabel={t('expenses.settlement.closeSheet')}
        panelClassName="max-w-md"
      >
        <Card className="relative w-full bg-surface-1 shadow-2xl shadow-black/50" padding="lg" radius="3xl" variant="surface">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-primary/40" />
          <h2 className="text-xl font-bold text-surface-2">{t('expenses.settlement.title')}</h2>
          <p className="mt-2 text-sm text-surface-2/80">
            {balance?.direction === 'you_are_owed'
              ? t('expenses.settlement.confirmReceipt', { amount: amountLabel, name: counterpartyName })
              : t('expenses.settlement.confirmTransfer', { amount: amountLabel, name: counterpartyName })}
          </p>

          <FormField className="mt-4" label={t('expenses.settlement.noteOptional')} labelClassName="text-xs font-semibold uppercase tracking-wider text-surface-2/60">
            <TextInput
              maxLength={200}
              placeholder={t('expenses.settlement.notePlaceholder')}
              size="md"
              type="text"
              variant="soft"
              {...register('note')}
            />
          </FormField>
          {errors.note && <p className="mt-2 text-xs text-red-400">{t(errors.note.message!)}</p>}

          <Button
            className="mt-5 text-lg font-bold shadow-lg shadow-primary/20 disabled:opacity-50"
            disabled={createSettlementMutation.isPending}
            onClick={handleConfirmSettlement}
            fullWidth
          >
            {createSettlementMutation.isPending ? t('common.saving') : t('expenses.settlement.confirmButton')}
          </Button>
          <Button
            className="mt-2 border-primary/20 text-sm font-semibold text-surface-2/60"
            onClick={() => setSettlementSheetOpen(false)}
            fullWidth
            variant="subtle"
          >
            {t('cta.cancel')}
          </Button>
        </Card>
      </Modal>

      <PageHeader
        title={t('expenses.dashboardTitle')}
        subtitle={t('nav.expenses')}
        rightSlot={(
          <Button
            aria-label={t('expenses.openSearch')}
            className="text-surface-2/60 hover:text-surface-2"
            onClick={() => navigate({ to: '/expenses/list' })}
            size="icon"
            variant="icon"
          >
            <span className="material-symbols-outlined">search</span>
          </Button>
        )}
      />

      <main className="mx-auto max-w-md px-4 pt-5">
        <DataStatusBanner isOffline={!isOnline} isStale={isStale} isFetching={isFetching} />

        {actionError ? <ErrorBanner className="mb-3" message={actionError} /> : null}

        <section className="relative overflow-hidden rounded-[2.5rem] bg-surface-1 p-7 shadow-2xl shadow-black/40 border border-border-strong">
          <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-10 -right-6 opacity-[0.07] pointer-events-none">
            <span className="material-symbols-outlined !text-[12rem] select-none">
              {balance?.direction === 'settled' ? 'check_circle' : 'account_balance_wallet'}
            </span>
          </div>

          <div className="relative">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-primary/60">
              {t('expenses.currentBalance')}
            </p>
            <h2 className={`mt-1 text-3xl font-extrabold leading-tight text-surface-2`}>
              {balanceHeadline}
            </h2>

            <p className={`mt-2 text-4xl font-black ${balance?.direction === 'settled' ? 'text-surface-2/40' : 'text-primary'}`}>
              {amountLabel}
            </p>

            {balance?.direction !== 'settled' && (
              <Button
                className="mt-8 gap-3 text-xl font-bold text-background-dark shadow-lg shadow-primary/20"
                onClick={() => setSettlementSheetOpen(true)}
                fullWidth
                size="lg"
              >
                <span className="material-symbols-outlined filled-icon">payments</span>
                {t('expenses.settleDebt')}
              </Button>
            )}

            {balance?.direction === 'settled' && (
              <div className="mt-2 flex items-center gap-2 text-sm font-bold text-primary/80">
                <span className="material-symbols-outlined !text-lg">done_all</span>
                {t('expenses.balance.settledSubtitle')}
              </div>
            )}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-2xl font-bold tracking-tight text-surface-2">{t('expenses.historyTitle')}</h3>
          </div>

          {activityItems.length === 0 ? (
            <Card className="text-center text-sm text-surface-2/60" padding="lg" radius="2xl" variant="surface">
              {t('expenses.emptyFirstExpense')}
            </Card>
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

      <Button
        aria-label={t('expenses.newExpense')}
        className="fixed bottom-28 right-6 z-30 h-16 w-16 rounded-full p-0 text-background-dark shadow-2xl shadow-primary/30"
        onClick={() => navigate({ to: '/expenses/new' })}
        variant="primary"
      >
        <span className="material-symbols-outlined text-4xl">add</span>
      </Button>
    </div>
  );
}
