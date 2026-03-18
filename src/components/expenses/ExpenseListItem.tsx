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

const categoryColorMap: Record<string, { bg: string; text: string }> = {
  shopping_cart: { bg: 'bg-[#fb923c]/15', text: 'text-[#fb923c]' }, // Orange
  restaurant: { bg: 'bg-[#60a5fa]/15', text: 'text-[#60a5fa]' },   // Blue
  home: { bg: 'bg-[#a78bfa]/15', text: 'text-[#a78bfa]' },         // Purple
  directions_car: { bg: 'bg-[#facc15]/15', text: 'text-[#facc15]' },// Yellow
  local_hospital: { bg: 'bg-[#4ade80]/15', text: 'text-[#4ade80]' },// Green
  movie: { bg: 'bg-[#f472b6]/15', text: 'text-[#f472b6]' },        // Pink
  flight: { bg: 'bg-[#22d3ee]/15', text: 'text-[#22d3ee]' },       // Cyan
  subscriptions: { bg: 'bg-[#f87171]/15', text: 'text-[#f87171]' }, // Red
  redeem: { bg: 'bg-[#fbbf24]/15', text: 'text-[#fbbf24]' },       // Amber
  category: { bg: 'bg-[#94a3b8]/15', text: 'text-[#94a3b8]' },     // Slate
};

export default function ExpenseListItem({
  expense,
  locale,
  currentProfileId,
  showWhenLabel = true,
  onClick,
}: ExpenseListItemProps): React.ReactElement {
  const { t } = useTranslation();

  const icon = expense.category?.icon ?? 'shopping_cart';
  const categoryName =
    locale.startsWith('es')
      ? expense.category?.name_es ?? t('expenses.categoryFallback')
      : expense.category?.name_en ?? t('expenses.categoryFallback');

  const { bg: iconBg, text: iconText } = categoryColorMap[icon] || categoryColorMap.category;

  const amountLabel = centsToCurrency(expense.amount_cents, locale);
  const splitAmountLabel = centsToCurrency(Math.round(expense.amount_cents / 2), locale);

  const isDebtor = expense.paid_by_profile_id !== currentProfileId;
  const impactLabel = isDebtor
    ? t('expenses.impact.youOwe', { amount: splitAmountLabel })
    : t('expenses.impact.theyOwe', { amount: splitAmountLabel });

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
      className={`group relative flex items-center gap-4 rounded-[2.5rem] border border-white/5 bg-[#141d1b] p-4 pr-6 transition-all active:scale-[0.98] ${
        onClick ? 'cursor-pointer hover:bg-[#1a2523]' : ''
      }`}
      {...clickableProps}
    >
      {/* Icon Container */}
      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${iconBg} ${iconText}`}>
        <span className="material-symbols-outlined !text-2xl">{icon}</span>
      </div>

      {/* Info Container */}
      <div className="flex-1 min-w-0">
        <h3 className="truncate text-xl font-bold tracking-tight text-slate-100">
          {expense.description?.trim() || categoryName}
        </h3>
        <p className="text-sm font-medium text-slate-500">
          {whenLabel}
        </p>
      </div>

      {/* Amount Container */}
      <div className="text-right flex flex-col items-end">
        <p className="text-xl font-bold tracking-tight text-slate-100">
          {amountLabel}
        </p>
        <p className={`text-[10px] font-black uppercase tracking-[0.05em] ${isDebtor ? 'text-rose-400' : 'text-[#2ecc71]'}`}>
          {impactLabel}
        </p>
      </div>
    </article>
  );
}
