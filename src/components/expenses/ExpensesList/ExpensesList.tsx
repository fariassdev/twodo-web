import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ExpenseActivityFeedItem } from '../../../lib/queries';
import { centsToCurrency, toRelativeExpenseDate } from '../../../helpers/expense';
import type { ExpenseWithDetails } from '../../../lib/types';
import ExpenseListItem from '../ExpenseListItem';
import IconBox from '../../ui/IconBox';
import ListRow from '../../ui/ListRow';

type ExpensesListProps = {
  items?: ExpenseActivityFeedItem[];
  expenses?: ExpenseWithDetails[];
  locale: string;
  currentProfileId: string | null;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  onExpenseClick?: (expenseId: string) => void;
};

export default function ExpensesList({
  items = [],
  expenses = [],
  locale,
  currentProfileId,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  onExpenseClick,
}: ExpensesListProps): React.ReactElement {
  const { t } = useTranslation();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const effectiveItems = useMemo(() => {
    if (items.length > 0) return items;
    if (expenses.length === 0) return [];

    return expenses.map((expense) => ({
      type: 'expense' as const,
      id: expense.id,
      activity_day: expense.expense_date,
      activity_at: `${expense.expense_date}T00:00:00`,
      created_at: expense.created_at,
      expense,
    }));
  }, [items, expenses]);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !onLoadMore || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          onLoadMore();
        }
      },
      { rootMargin: '240px 0px' },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, onLoadMore, items.length]);

  return (
    <div className="flex flex-col gap-3">
      {effectiveItems.map((item) => {
        if (item.type === 'expense') {
          return (
            <div key={`expense-${item.id}`}>
              <ExpenseListItem
                currentProfileId={currentProfileId}
                expense={item.expense}
                locale={locale}
                showWhenLabel={true}
                onClick={onExpenseClick ? () => onExpenseClick(item.expense.id) : undefined}
              />
            </div>
          );
        }

        const settlement = item.settlement;

        return (
          <ListRow
            as="article"
            key={`settlement-${item.id}`}
            className="group pr-6"
            variant="subtle"
          >
            <IconBox className="bg-primary/15 text-primary" size="lg" tone="custom">
              <span className="material-symbols-outlined !text-2xl">payments</span>
            </IconBox>

            <div className="flex-1 min-w-0">
              <h3 className="truncate text-xl font-bold tracking-tight text-surface-2">
                {t('expenses.settleUp')}
              </h3>
              <p className="text-sm font-medium text-surface-2/60">
                {toRelativeExpenseDate(item.activity_day, locale, {
                  today: t('expenses.today'),
                  yesterday: t('expenses.yesterday'),
                })}
              </p>
            </div>

            <div className="text-right flex flex-col items-end">
              <p className="text-xl font-extrabold tracking-tight text-primary">
                {centsToCurrency(settlement.amount_cents, locale)}
              </p>
              <p className="text-[10px] font-black uppercase tracking-[0.05em] text-primary/80">
                {t('expenses.settlement.feedStatus')}
              </p>
            </div>
          </ListRow>
        );
      })}

      {hasNextPage ? <div ref={sentinelRef} className="h-1 w-full" /> : null}

      {isFetchingNextPage ? (
        <div className="flex items-center justify-center py-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : null}
    </div>
  );
}
