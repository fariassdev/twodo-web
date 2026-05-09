import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PageHeader from '../../ui/PageHeader';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import DataStatusBanner from '../../ui/DataStatusBanner';
import ErrorBanner from '../../ui/ErrorBanner';
import QueryErrorState from '../../ui/QueryErrorState';
import FullPageLoading from '../../ui/FullPageLoading';
import ExpensesList from '../ExpensesList';
import { useOnlineStatus } from '../../../hooks/useOnlineStatus';
import { centsToCurrency } from '../../../helpers/expense';
import {
  useAuthScope,
  useExpensesActivityFeedInfiniteQuery,
  useExpensesDashboardQuery,
} from '../../../lib/queryHooks';
import { cn } from '@/src/utils';


export default function ExpensesDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const { profileId } = useAuthScope();

  const dashboardQuery = useExpensesDashboardQuery();
  const activityQuery = useExpensesActivityFeedInfiniteQuery(20);

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

        <section className="relative overflow-hidden rounded-xl bg-surface-1 p-8 shadow-card-lg border border-border-strong">
          {/* Decorative background elements */}
          <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-primary/15 blur-3xl z-0" />
          <div className="absolute -bottom-6 -right-6 opacity-[0.05] pointer-events-none z-0">
            <span className="material-symbols-outlined !text-[10rem] select-none">
              {balance?.direction === 'settled' ? 'check_circle' : 'account_balance_wallet'}
            </span>
          </div>
          
          {/* Main Content Layer */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <header className="w-full flex items-center justify-start gap-2 text-xs font-semibold uppercase tracking-[0.09em] text-surface-2/60 mb-2">
              <motion.div 
                animate={{ 
                  backgroundColor: isFetching 
                    ? 'rgba(73, 52, 33, 0.1)' 
                    : (balance?.direction === 'settled' 
                        ? 'var(--color-success)' 
                        : (balance?.direction === 'you_are_owed' ? 'var(--color-success)' : 'var(--color-danger)')) 
                }}
                className={cn(
                  "w-[7px] h-[7px] rounded-full shrink-0",
                  isFetching && "animate-pulse"
                )}
              />
              {t('expenses.currentBalance')}
            </header>

            <div className="flex flex-col items-center gap-2">
              <AnimatePresence mode="wait">
                <motion.h2 
                  key={balanceHeadline}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.3 }}
                  className="text-xl font-bold tracking-tight text-surface-2"
                >
                  {balanceHeadline}
                </motion.h2>
              </AnimatePresence>

              <div className="flex flex-col items-center justify-center py-2" aria-live="polite">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={amountLabel}
                    initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                    className="flex items-start leading-none gap-[0.5rem]"
                  >
                    <span className={cn(
                      "font-display text-[clamp(3rem,15vw,5rem)] font-normal tracking-[-0.02em] leading-[0.9] tabular-nums transition-colors italic",
                      balance?.direction === 'settled' 
                        ? 'text-surface-2/10' 
                        : (balance?.direction === 'you_are_owed' ? 'text-success' : 'text-danger')
                    )}>
                      {balance?.direction === 'settled' ? '0' : amountLabel.replace(/[^\d.,]/g, '')}
                    </span>
                    <span className="font-sans text-[clamp(1.2rem,6vw,2.2rem)] font-light text-surface-2/20 pt-[0.4rem] transition-colors">
                      €
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-4 w-full flex flex-col items-center max-w-[280px]">
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
                      onClick={() => navigate({ to: '/expenses/settle' })}
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
