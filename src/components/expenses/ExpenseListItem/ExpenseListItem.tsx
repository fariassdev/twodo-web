import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Expense } from '../../../domain/expense';
import { centsToCurrency, toRelativeExpenseDate } from '../../../helpers/expense';
import IconBox from '../../ui/IconBox';
import ListRow from '../../ui/ListRow';
import { cn } from '@/src/utils';

type ExpenseListItemProps = {
  expense: Expense;
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
    today: t('common.today'),
    yesterday: t('common.yesterday'),
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
    <ListRow
      className="group p-3 gap-3"
      interactive={Boolean(onClick)}
      variant="subtle"
      {...clickableProps}
    >
      {/* Icon Container */}
      <IconBox className={cn(iconBg, iconText, "rounded-xl")} size="sm" tone="custom">
        <span className="material-symbols-outlined !text-[20px]">{icon}</span>
      </IconBox>

      {/* Info Container */}
      <div className="flex-1 min-w-0">
        <h3 className="truncate text-base font-bold tracking-tight text-surface-2">
          {expense.description?.trim() || categoryName}
        </h3>
        <p className="text-sm font-medium text-surface-2/60">
          {whenLabel}
        </p>
      </div>

      {/* Amount Container */}
      <div className="text-right flex flex-col items-end">
        <p className="text-lg font-bold tracking-tight text-surface-2 flex items-baseline gap-1">
          <span>{amountLabel.replace(/[^\d.,]/g, '')}</span>
          <span className="text-sm font-medium text-surface-2/30">€</span>
        </p>
        <p className={`text-[9px] font-bold uppercase tracking-[0.05em] ${isDebtor ? 'text-danger' : 'text-success'}`}>
          {impactLabel}
        </p>
      </div>
    </ListRow>
  );
}
