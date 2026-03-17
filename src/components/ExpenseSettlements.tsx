import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import TopBar from './ui/TopBar';
import QueryErrorState from './ui/QueryErrorState';
import {
  useCreateSettlementMutation,
  useExpenseBalanceSnapshotQuery,
  useSettlementsHistoryQuery,
} from '../lib/queryHooks';
import { centsToCurrency } from '../lib/expenseUtils';

export default function ExpenseSettlements() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const balanceQuery = useExpenseBalanceSnapshotQuery();
  const settlementsQuery = useSettlementsHistoryQuery();
  const createSettlementMutation = useCreateSettlementMutation();

  const [note, setNote] = useState('');
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const balance = balanceQuery.data;
  const amountLabel = centsToCurrency(balance?.amountCents ?? 0, i18n.language);
  const counterpartyName = balance?.counterpartyProfile?.name ?? t('expenses.partnerFallback');

  const canSettle = balance?.direction === 'you_owe' && (balance?.amountCents ?? 0) > 0;

  async function handleSettle() {
    if (!canSettle) return;

    setActionError(null);
    try {
      await createSettlementMutation.mutateAsync({ note });
      setNote('');
      setSheetOpen(false);
    } catch (error) {
      console.error('Create settlement error:', error);
      setActionError(t('queryState.mutationError'));
    }
  }

  if (balanceQuery.isPending || settlementsQuery.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (balanceQuery.isError || settlementsQuery.isError) {
    return <QueryErrorState onRetry={() => Promise.all([balanceQuery.refetch(), settlementsQuery.refetch()])} />;
  }

  return (
    <div className="pb-24">
      {isSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
          <button
            aria-label={t('expenses.settlement.closeSheet')}
            className="absolute inset-0 bg-background-dark/80 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
            type="button"
          />
          <div className="relative w-full max-w-md rounded-3xl border border-primary/20 bg-[#102620] p-5 shadow-2xl shadow-black/50">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-primary/40" />
            <h2 className="text-xl font-bold text-slate-100">{t('expenses.settlement.title')}</h2>
            <p className="mt-2 text-sm text-slate-300">
              {t('expenses.settlement.confirmTransfer', { amount: amountLabel, name: counterpartyName })}
            </p>
            <input
              className="mt-4 h-12 w-full rounded-xl border border-primary/20 bg-primary/5 px-4 text-sm text-slate-100 placeholder:text-slate-500"
              placeholder={t('expenses.settlement.notePlaceholder')}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <button
              className="mt-5 h-12 w-full rounded-2xl bg-primary text-lg font-bold text-background-dark disabled:opacity-50"
              disabled={createSettlementMutation.isPending}
              onClick={handleSettle}
              type="button"
            >
              {createSettlementMutation.isPending ? t('common.saving') : t('expenses.settlement.confirmButton')}
            </button>
            <button
              className="mt-2 h-12 w-full rounded-2xl border border-primary/20 text-sm font-semibold text-slate-300"
              onClick={() => setSheetOpen(false)}
              type="button"
            >
              {t('cta.cancel')}
            </button>
          </div>
        </div>
      )}

      <TopBar
        title={t('expenses.settlementsTitle')}
        leftAction={{
          ariaLabel: t('topBar.back'),
          icon: 'arrow_back',
          onClick: () => navigate({ to: '/expenses' }),
        }}
      />

      <main className="mx-auto max-w-md px-4 pt-5">
        {actionError && (
          <p className="mb-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-100">
            {actionError}
          </p>
        )}

        <section className="rounded-3xl border border-primary/20 bg-gradient-to-r from-[#123d32] to-[#0e2b24] p-5 shadow-xl shadow-black/20">
          <p className="text-xs uppercase tracking-widest text-primary/80">{t('expenses.currentBalance')}</p>
          <h2 className="mt-2 text-4xl font-black text-slate-100">{amountLabel}</h2>
          <p className="mt-2 text-lg text-slate-100">
            {balance?.direction === 'you_owe'
              ? t('expenses.balance.youOwe', { name: counterpartyName })
              : balance?.direction === 'you_are_owed'
                ? t('expenses.balance.theyOweYou', { name: counterpartyName })
                : t('expenses.balance.settled')}
          </p>

          {canSettle ? (
            <button
              className="mt-4 h-12 rounded-2xl bg-primary px-5 text-base font-bold text-background-dark"
              onClick={() => setSheetOpen(true)}
              type="button"
            >
              {t('expenses.settleUp')}
            </button>
          ) : (
            <p className="mt-4 text-sm text-slate-300">{t('expenses.settlement.onlyDebtorHint')}</p>
          )}
        </section>

        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-3xl font-bold text-slate-100">{t('expenses.historyTitle')}</h3>
          </div>

          {(settlementsQuery.data ?? []).length === 0 ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm text-slate-300">
              {t('expenses.emptySettlements')}
            </div>
          ) : (
            <div className="space-y-3">
              {(settlementsQuery.data ?? []).map((settlement) => (
                <article
                  key={settlement.id}
                  className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-slate-100">
                        {t('expenses.settlement.paidTo', {
                          from: settlement.paid_by_profile?.name ?? t('expenses.partnerFallback'),
                          to: settlement.paid_to_profile?.name ?? t('expenses.partnerFallback'),
                        })}
                      </p>
                      <p className="text-sm text-slate-400">
                        {new Date(settlement.settled_at).toLocaleDateString(i18n.language, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <p className="text-3xl font-black text-primary">
                      {centsToCurrency(settlement.amount_cents, i18n.language)}
                    </p>
                  </div>
                  {settlement.note ? (
                    <p className="mt-2 text-sm text-slate-300">{settlement.note}</p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
