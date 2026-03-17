import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import TopBar from './ui/TopBar';
import QueryErrorState from './ui/QueryErrorState';
import ExpenseListItem from './expenses/ExpenseListItem';
import ExpensesActivityFeed from './expenses/ExpensesActivityFeed';
import { formatMonthHeading, groupExpensesByMonth } from '../lib/expenseUtils';
import {
  useAuthScope,
  useExpensesActivityFeedInfiniteQuery,
  useExpenseCategoriesQuery,
  useExpensesListQuery,
  useProfilesQuery,
} from '../lib/queryHooks';

function formatDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultDateRange(): { fromDate: string; toDate: string } {
  const toDate = new Date();
  const fromDate = new Date(toDate);
  fromDate.setDate(toDate.getDate() - 29);

  return {
    fromDate: formatDateInputValue(fromDate),
    toDate: formatDateInputValue(toDate),
  };
}

export default function ExpensesList() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profileId } = useAuthScope();
  const defaultDateRange = useMemo(() => getDefaultDateRange(), []);

  const categoriesQuery = useExpenseCategoriesQuery();
  const profilesQuery = useProfilesQuery();

  const [categoryId, setCategoryId] = useState<string>('all');
  const [paidByProfileId, setPaidByProfileId] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>(defaultDateRange.fromDate);
  const [toDate, setToDate] = useState<string>(defaultDateRange.toDate);
  const [isDateRangeOpen, setIsDateRangeOpen] = useState<boolean>(false);

  const hasActiveFilters = useMemo(
    () =>
      categoryId !== 'all' ||
      paidByProfileId !== 'all' ||
      searchText.trim().length > 0 ||
      fromDate !== defaultDateRange.fromDate ||
      toDate !== defaultDateRange.toDate,
    [categoryId, defaultDateRange.fromDate, defaultDateRange.toDate, fromDate, paidByProfileId, searchText, toDate],
  );

  const filters = useMemo(
    () => ({
      categoryId: categoryId === 'all' ? undefined : categoryId,
      paidByProfileId: paidByProfileId === 'all' ? undefined : paidByProfileId,
      searchText: searchText.trim() || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    }),
    [categoryId, fromDate, paidByProfileId, searchText, toDate],
  );

  const clearAllFilters = () => {
    setCategoryId('all');
    setPaidByProfileId('all');
    setSearchText('');
    setFromDate(defaultDateRange.fromDate);
    setToDate(defaultDateRange.toDate);
    setIsDateRangeOpen(false);
  };

  const expensesQuery = useExpensesListQuery(filters, { enabled: hasActiveFilters });
  const activityQuery = useExpensesActivityFeedInfiniteQuery(20, { enabled: !hasActiveFilters });

  const expenses = expensesQuery.data ?? [];
  const groups = groupExpensesByMonth(expenses);
  const activityItems = useMemo(
    () => activityQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [activityQuery.data],
  );
  const emptySubtitle = hasActiveFilters
    ? t('expenses.emptyNoResultsSubtitle')
    : t('expenses.emptyFirstExpense');

  const isPending = hasActiveFilters ? expensesQuery.isPending : activityQuery.isPending;
  const isError = hasActiveFilters ? expensesQuery.isError : activityQuery.isError;

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError) {
    return <QueryErrorState onRetry={() => (hasActiveFilters ? expensesQuery.refetch() : activityQuery.refetch())} />;
  }

  return (
    <div className="pb-24">
      <TopBar
        title={t('expenses.allExpenses')}
        leftAction={{
          ariaLabel: t('topBar.back'),
          icon: 'arrow_back',
          onClick: () => navigate({ to: '/expenses' }),
        }}
      />

      <main className="mx-auto max-w-md px-4 pt-4 pb-8">
        <div className="relative">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            search
          </span>
          <input
            className="h-12 w-full rounded-2xl border border-slate-700/45 bg-slate-900/75 pl-11 pr-4 text-base text-slate-100 outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/20"
            placeholder={t('expenses.searchExpensesPlaceholder')}
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <div className="relative min-w-[10.5rem] flex-1">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300">
              category
            </span>
            <select
              className="h-11 w-full appearance-none rounded-full border border-primary/25 bg-[#10223d]/75 pl-10 pr-9 text-sm font-semibold text-slate-100 outline-none"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="all">{t('expenses.filterCategory')}</option>
              {(categoriesQuery.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {i18n.language.startsWith('es') ? category.name_es : category.name_en}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
              expand_more
            </span>
          </div>

          <div className="relative min-w-[10.5rem] flex-1">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300">
              person
            </span>
            <select
              className="h-11 w-full appearance-none rounded-full border border-primary/25 bg-[#10223d]/75 pl-10 pr-9 text-sm font-semibold text-slate-100 outline-none"
              value={paidByProfileId}
              onChange={(event) => setPaidByProfileId(event.target.value)}
            >
              <option value="all">{t('expenses.filterPaidBy')}</option>
              {(profilesQuery.data ?? []).map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.id === profileId ? t('expenses.meWithName', { name: profile.name }) : profile.name}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
              expand_more
            </span>
          </div>

          <button
            className="flex h-11 min-w-[10.5rem] flex-1 items-center gap-2 rounded-full border border-primary/25 bg-[#10223d]/75 px-3 text-sm font-semibold text-slate-100"
            onClick={() => setIsDateRangeOpen((current) => !current)}
            type="button"
          >
            <span className="material-symbols-outlined text-slate-200">calendar_month</span>
            <span className="truncate">{t('expenses.dateRange')}</span>
            <span className="material-symbols-outlined ml-auto text-slate-300">expand_more</span>
          </button>
        </div>

        {isDateRangeOpen && (
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-primary/20 bg-slate-900/70 p-3">
            <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <span>{t('expenses.dateFrom')}</span>
              <input
                className="h-10 w-full rounded-xl border border-primary/25 bg-background-dark px-3 text-sm text-slate-100 outline-none focus:border-primary/70"
                max={toDate || undefined}
                type="date"
                value={fromDate}
                onChange={(event) => {
                  const nextFrom = event.target.value;
                  setFromDate(nextFrom);
                  if (toDate && nextFrom > toDate) {
                    setToDate(nextFrom);
                  }
                }}
              />
            </label>

            <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <span>{t('expenses.dateTo')}</span>
              <input
                className="h-10 w-full rounded-xl border border-primary/25 bg-background-dark px-3 text-sm text-slate-100 outline-none focus:border-primary/70"
                min={fromDate || undefined}
                type="date"
                value={toDate}
                onChange={(event) => {
                  const nextTo = event.target.value;
                  setToDate(nextTo);
                  feat(expenses): add combined activity feed with infinite scroll
                  
                  - Add unified expenses+settlements activity feed query and types
                  - Introduce useExpensesActivityFeedInfiniteQuery hook (useInfiniteQuery)
                  - Add ExpensesActivityFeed component with day grouping + load-more sentinel
                  - Update ExpensesDashboard and ExpensesList to use mixed feed (20 items/page)
                  - Preserve existing filters behavior (hide settlements when filters active)
                  - Add i18n keys for settlement feed status                  if (fromDate && nextTo < fromDate) {
                    setFromDate(nextTo);
                  }
                }}
              />
            </label>
          </div>
        )}

        {(hasActiveFilters ? groups.length === 0 : activityItems.length === 0) ? (
          <div className="mt-10 flex flex-col items-center px-2 text-center">
            <div className="relative flex h-52 w-52 items-center justify-center rounded-full border border-primary/20 bg-slate-900/35 shadow-[0_0_120px_rgba(23,207,145,0.12)]">
              <span className="material-symbols-outlined filled-icon !text-7xl text-primary/55">receipt_long</span>
              <div className="absolute right-6 top-5 flex h-12 w-12 items-center justify-center rounded-full border border-primary/25 bg-slate-900">
                <span className="material-symbols-outlined text-xl text-primary">search_off</span>
              </div>
            </div>

            <h2 className="mt-8 text-[2.1rem] font-black tracking-tight text-slate-100">
              {t('expenses.emptyNoResultsTitle')}
            </h2>
            <p className="mt-3 max-w-sm text-lg leading-relaxed text-slate-300">{emptySubtitle}</p>

            <button
              className="mt-8 flex h-16 w-full max-w-[22rem] items-center justify-center gap-2 rounded-3xl bg-primary px-6 text-lg font-black text-background-dark shadow-[0_20px_40px_-16px_rgba(23,207,145,0.65)]"
              onClick={() => navigate({ to: '/expenses/new' })}
              type="button"
            >
              <span className="material-symbols-outlined text-3xl">add</span>
              <span>{t('expenses.addExpense')}</span>
            </button>

            {hasActiveFilters && (
              <button
                className="mt-5 text-lg font-bold text-primary"
                onClick={clearAllFilters}
                type="button"
              >
                {t('expenses.clearAllFilters')}
              </button>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-7">
            {hasActiveFilters ? (
              groups.map((group) => (
                <section key={group.month}>
                  <h2 className="mb-3 text-sm font-black tracking-[0.2em] text-slate-400">
                    {formatMonthHeading(group.month, i18n.language)}
                  </h2>
                  <div className="space-y-3">
                    {group.items.map((expense) => (
                      <div key={expense.id}>
                        <ExpenseListItem
                          currentProfileId={profileId}
                          expense={expense}
                          locale={i18n.language}
                          onClick={() => navigate({ to: '/expenses/$expenseId', params: { expenseId: expense.id } })}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <ExpensesActivityFeed
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
                onExpenseClick={(expenseId) => navigate({ to: '/expenses/$expenseId', params: { expenseId } })}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
