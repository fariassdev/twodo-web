import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PageHeader from '../../ui/PageHeader';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import DataStatusBanner from '../../ui/DataStatusBanner';
import ErrorBanner from '../../ui/ErrorBanner';
import FormField from '../../ui/FormField';
import Modal from '../../ui/Modal';
import QueryErrorState from '../../ui/QueryErrorState';
import TextInput from '../../ui/TextInput';
import FullPageLoading from '../../ui/FullPageLoading';
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
import { cn } from '@/src/utils';


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
    return <FullPageLoading message={t('loading')} />;
  }


  if ((dashboardQuery.isError && !dashboardData) || (activityQuery.isError && activityItems.length === 0)) {
    return <QueryErrorState onRetry={retryQuery} />;
  }

  return (
    <div>
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

      <main className="mx-auto max-w-md w-full px-4 pt-5 pb-8">
        <DataStatusBanner isOffline={!isOnline} isStale={isStale} isFetching={isFetching} />

        {actionError ? <ErrorBanner className="mb-3" message={actionError} /> : null}

        <section className="relative overflow-hidden rounded-xl bg-surface-1 p-8 shadow-card-lg border border-border-strong">
          {/* Subtle background glow */}
          <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
          
          <div className="relative">
            <header className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.09em] text-surface-2/60 mb-2">
              <motion.div 
                animate={{ 
                  backgroundColor: isFetching 
                    ? 'rgba(73, 52, 33, 0.1)' 
                    : (balance?.direction === 'settled' ? 'var(--color-success)' : 'var(--color-primary)') 
                }}
                className={cn(
                  "w-[7px] h-[7px] rounded-full shrink-0",
                  isFetching && "animate-pulse"
                )}
              />
              {t('expenses.currentBalance')}
            </header>

            <div className="flex flex-col gap-4">
              <AnimatePresence mode="wait">
                <motion.h2 
                  key={balanceHeadline}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.3 }}
                  className="text-base font-semibold leading-relaxed text-surface-2/70 max-w-[90%]"
                >
                  {balanceHeadline}
                </motion.h2>
              </AnimatePresence>

              <div className="flex flex-col items-center justify-center py-4" aria-live="polite">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={amountLabel}
                    initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                    className="flex items-start leading-none gap-[0.05em]"
                  >
                    <span className={cn(
                      "font-display text-[clamp(4.5rem,18vw,6rem)] font-normal tracking-[-0.02em] leading-[0.9] tabular-nums transition-colors italic",
                      balance?.direction === 'settled' ? 'text-surface-2/20' : 'text-primary'
                    )}>
                      {balance?.direction === 'settled' ? '0' : amountLabel.replace(/[^\d.,]/g, '')}
                    </span>
                    <span className="font-sans text-[clamp(1.2rem,5vw,2rem)] font-light text-surface-2/30 pt-[0.2em] transition-colors">
                      €
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-4 flex flex-col items-center">
              {balance?.direction !== 'settled' ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key="settle-button"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full"
                  >
                    <Button
                      className="gap-3 text-lg font-bold text-background-dark shadow-button bg-primary hover:bg-primary/90 transition-all active:scale-[0.98]"
                      onClick={() => setSettlementSheetOpen(true)}
                      fullWidth
                      size="lg"
                    >
                      <span className="material-symbols-outlined filled-icon text-[20px]">payments</span>
                      {t('expenses.settleDebt')}
                    </Button>
                  </motion.div>
                </AnimatePresence>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div 
                    key="settled-badge"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-xs font-bold uppercase tracking-wider text-success"
                  >
                    <span className="material-symbols-outlined !text-[16px] filled-icon">verified</span>
                    {t('expenses.balance.settledSubtitle')}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Watermark Icon */}
          <div className="absolute -bottom-6 -right-6 opacity-[0.05] pointer-events-none">
            <span className="material-symbols-outlined !text-[10rem] select-none">
              {balance?.direction === 'settled' ? 'check_circle' : 'account_balance_wallet'}
            </span>
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
        className="fixed bottom-24 right-6 z-fab"
        onClick={() => navigate({ to: '/expenses/new' })}
        variant="action"
        size="icon"
      >
        <Plus className="w-8 h-8 stroke-[2.5]" />
      </Button>
    </div>
  );
}
