import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ExpenseWithDetails } from '../../lib/types';
import { centsToCurrency, toRelativeExpenseDate } from '../../lib/expenseUtils';

type ExpenseListItemProps = {
  expense: ExpenseWithDetails;
  locale: string;
  currentProfileId: string | null;
  showWhenLabel?: boolean;
  onClick?: () => void | Promise<void>;
};

export default function ExpenseListItem({
  expense,
  locale,
  currentProfileId,
  showWhenLabel = true,
  onClick,
}: ExpenseListItemProps): React.ReactElement {
  const { t } = useTranslation();

  const icon = expense.category?.icon ?? 'receipt_long';
  const categoryName =
    locale.startsWith('es')
      ? expense.category?.name_es ?? t('expenses.categoryFallback')
      : expense.category?.name_en ?? t('expenses.categoryFallback');

  const amountLabel = centsToCurrency(expense.amount_cents, locale);
  const splitAmountLabel = centsToCurrency(Math.round(expense.amount_cents / 2), locale);
  const paidByLabel =
    expense.paid_by_profile_id === currentProfileId
      ? t('expenses.paidByYou')
      : t('expenses.paidByName', { name: expense.paid_by_profile?.name ?? t('expenses.partnerFallback') });

  const impactLabel =
    expense.paid_by_profile_id === currentProfileId
      ? t('expenses.impact.theyOwe', { amount: splitAmountLabel })
      : t('expenses.impact.youOwe', { amount: splitAmountLabel });

  const whenLabel = toRelativeExpenseDate(expense.expense_date, locale, {
    today: t('expenses.today'),
    yesterday: t('expenses.yesterday'),
  });

  const clickableProps = onClick
    ? {
        role: 'button' as const,
        tabIndex: 0,
        onClick,
        onKeyDown: (event: React.KeyboardEvent) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick();
          }
        },
      }
    : {};

  return (
    <article
      className={`rounded-3xl border border-primary/20 bg-primary/10 p-4 shadow-lg shadow-black/10 ${
        onClick ? 'cursor-pointer transition-transform active:scale-[0.99]' : ''
      }`}
      {...clickableProps}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary">
          <span className="material-symbols-outlined">{icon}</span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-2xl font-bold leading-tight text-slate-100">
            {expense.description?.trim() || categoryName}
          </p>
          <p className="truncate text-sm text-slate-300">{paidByLabel}</p>
        </div>

        <div className="text-right">
          <p className="text-2xl font-bold text-slate-100">{amountLabel}</p>
          <p className="text-sm font-semibold text-primary">
            {impactLabel}
          </p>
          {showWhenLabel ? (
            <p className="text-xs uppercase tracking-wide text-slate-400">{whenLabel}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
