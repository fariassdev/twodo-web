import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ExpenseActivityFeedItem } from '../../lib/queries';
import { centsToCurrency, toRelativeExpenseDate } from '../../lib/expenseUtils';
import type { ExpenseWithDetails } from '../../lib/types';
import ExpenseListItem from './ExpenseListItem';

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

type GroupedItems = {
  day: string;
  items: ExpenseActivityFeedItem[];
};

function groupItemsByDay(items: ExpenseActivityFeedItem[]): GroupedItems[] {
  const grouped: GroupedItems[] = [];

  for (const item of items) {
    const lastGroup = grouped[grouped.length - 1];

    if (lastGroup && lastGroup.day === item.activity_day) {
      lastGroup.items.push(item);
      continue;
    }

    grouped.push({ day: item.activity_day, items: [item] });
  }

  return grouped;
}

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

  const groups = useMemo(() => groupItemsByDay(effectiveItems), [effectiveItems]);

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
    <div className="space-y-7">
      {groups.map((group) => (
        <section key={group.day}>
          <h2 className="mb-3 text-sm font-black tracking-[0.2em] text-slate-400">
            {toRelativeExpenseDate(group.day, locale, {
              today: t('expenses.today'),
              yesterday: t('expenses.yesterday'),
            }).toUpperCase()}
          </h2>

          <div className="space-y-3">
            {group.items.map((item) => {
              if (item.type === 'expense') {
                return (
                  <div key={`expense-${item.id}`}>
                    <ExpenseListItem
                      currentProfileId={currentProfileId}
                      expense={item.expense}
                      locale={locale}
                      showWhenLabel={false}
                      onClick={onExpenseClick ? () => onExpenseClick(item.expense.id) : undefined}
                    />
                  </div>
                );
              }

              const settlement = item.settlement;
              const paidBy = settlement.paid_by_profile?.name ?? t('expenses.partnerFallback');
              const paidTo = settlement.paid_to_profile?.name ?? t('expenses.partnerFallback');

              return (
                <article
                  key={`settlement-${item.id}`}
                  className="rounded-3xl border border-primary/35 bg-gradient-to-r from-[#0f3f35] to-[#102620] p-4 shadow-lg shadow-black/20"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/25 text-primary">
                      <span className="material-symbols-outlined">payments</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-2xl font-bold leading-tight text-slate-100">
                        {t('expenses.settleUp')}
                      </p>
                      <p className="truncate text-sm text-slate-300">
                        {t('expenses.settlement.paidTo', { from: paidBy, to: paidTo })}
                      </p>
                      {settlement.note ? <p className="truncate text-xs text-slate-400">{settlement.note}</p> : null}
                    </div>

                    <div className="text-right">
                      <p className="text-3xl font-black text-primary">
                        {centsToCurrency(settlement.amount_cents, locale)}
                      </p>
                      <p className="text-sm font-black uppercase tracking-wide text-primary">
                        {t('expenses.settlement.feedStatus')}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {hasNextPage ? <div ref={sentinelRef} className="h-1 w-full" /> : null}

      {isFetchingNextPage ? (
        <div className="flex items-center justify-center py-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : null}
    </div>
  );
}
