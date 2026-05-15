import React, { useEffect, useMemo, useRef } from 'react';
import type { ExpenseActivityFeedItem } from '../../../domain/expense';
import ExpenseListItem from './ExpenseListItem';

type ExpensesListProps = {
  items?: ExpenseActivityFeedItem[];
  currentProfileId: string | null;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  onExpenseClick?: (expenseId: string) => void;
};

export default function ExpensesList({
  items = [],
  currentProfileId,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  onExpenseClick,
}: ExpensesListProps): React.ReactElement {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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
      {items.map((item) => {
        const data = item.type === 'expense' ? item.expense : item.settlement;
        
        return (
          <ExpenseListItem
            key={`${item.type}-${data.id}`}
            item={item}
            currentProfileId={currentProfileId}
            onClick={
              onExpenseClick && item.type === 'expense'
                ? () => onExpenseClick(item.expense.id)
                : undefined
            }
          />
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
