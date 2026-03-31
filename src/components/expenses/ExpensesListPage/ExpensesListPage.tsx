import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearch } from '@tanstack/react-router';
import TopBar from '../../ui/TopBar';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import QueryErrorState from '../../ui/QueryErrorState';
import SelectInput from '../../ui/SelectInput';
import TextInput from '../../ui/TextInput';
import ExpensesList from '../ExpensesList';
import {
  includesNormalizedText,
  normalizeSearchText,
} from '../../../helpers/expense';
import {
  useAuthScope,
  useExpensesActivityFeedInfiniteQuery,
  useExpenseCategoriesQuery,
  useExpensesListQuery,
  useProfilesQuery,
} from '../../../lib/queryHooks';
import type { ExpensesListSearch } from '../../../router';

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

function isValidDateInputValue(value: string | undefined): value is string {
  if (!value) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function buildExpensesListSearch(params: {
  q: string;
  categoryId: string;
  paidByProfileId: string;
  fromDate: string;
  toDate: string;
  defaultDateRange: { fromDate: string; toDate: string };
}): ExpensesListSearch {
  const search: ExpensesListSearch = {};
  const queryValue = params.q.trim();

  if (queryValue) {
    search.q = queryValue;
  }

  if (params.categoryId !== 'all') {
    search.categoryId = params.categoryId;
  }

  if (params.paidByProfileId !== 'all') {
    search.paidByProfileId = params.paidByProfileId;
  }

  if (params.fromDate !== params.defaultDateRange.fromDate) {
    search.fromDate = params.fromDate;
  }

  if (params.toDate !== params.defaultDateRange.toDate) {
    search.toDate = params.toDate;
  }

  return search;
}

export default function ExpensesListPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as Partial<ExpensesListSearch>;
  const { profileId } = useAuthScope();
  const defaultDateRange = useMemo(() => getDefaultDateRange(), []);
  const initialSearchText = searchParams.q ?? '';
  const initialFromDate = isValidDateInputValue(searchParams.fromDate)
    ? searchParams.fromDate
    : defaultDateRange.fromDate;
  const initialToDate = isValidDateInputValue(searchParams.toDate)
    ? searchParams.toDate
    : defaultDateRange.toDate;

  const categoriesQuery = useExpenseCategoriesQuery();
  const profilesQuery = useProfilesQuery();

  const [categoryId, setCategoryId] = useState<string>(searchParams.categoryId ?? 'all');
  const [paidByProfileId, setPaidByProfileId] = useState<string>(searchParams.paidByProfileId ?? 'all');
  const [inputSearchText, setInputSearchText] = useState<string>(initialSearchText);
  const [serverSearchText, setServerSearchText] = useState<string>(initialSearchText);
  const [fromDate, setFromDate] = useState<string>(initialFromDate);
  const [toDate, setToDate] = useState<string>(initialToDate);
  const [isDateRangeOpen, setIsDateRangeOpen] = useState<boolean>(false);
  const [isSearchDebouncing, setIsSearchDebouncing] = useState<boolean>(false);

  const normalizedInputSearch = useMemo(() => normalizeSearchText(inputSearchText), [inputSearchText]);
  const normalizedServerSearch = useMemo(() => normalizeSearchText(serverSearchText), [serverSearchText]);

  useEffect(() => {
    if (normalizedInputSearch === normalizedServerSearch) {
      setIsSearchDebouncing(false);
      return;
    }

    setIsSearchDebouncing(true);
    const timeoutId = window.setTimeout(() => {
      setServerSearchText(inputSearchText);
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [inputSearchText, normalizedInputSearch, normalizedServerSearch]);

  const updateListSearchInUrl = useCallback(
    (
      overrides: Partial<{
        q: string;
        categoryId: string;
        paidByProfileId: string;
        fromDate: string;
        toDate: string;
      }> = {},
    ) => {
      const nextSearch = buildExpensesListSearch({
        q: overrides.q ?? inputSearchText,
        categoryId: overrides.categoryId ?? categoryId,
        paidByProfileId: overrides.paidByProfileId ?? paidByProfileId,
        fromDate: overrides.fromDate ?? fromDate,
        toDate: overrides.toDate ?? toDate,
        defaultDateRange,
      });

      navigate({
        to: '/expenses/list',
        search: nextSearch,
        replace: true,
      });
    },
    [categoryId, defaultDateRange, fromDate, inputSearchText, navigate, paidByProfileId, toDate],
  );

  const listSearchParams = useMemo(
    () =>
      buildExpensesListSearch({
        q: inputSearchText,
        categoryId,
        paidByProfileId,
        fromDate,
        toDate,
        defaultDateRange,
      }),
    [categoryId, defaultDateRange, fromDate, inputSearchText, paidByProfileId, toDate],
  );

  const detailSearchFromList = useMemo(
    () => ({ from: 'list' as const, ...listSearchParams }),
    [listSearchParams],
  );

  const handleSearchChange = (value: string) => {
    setInputSearchText(value);
    updateListSearchInUrl({ q: value });
  };

  const clearSearchText = () => {
    setInputSearchText('');
    setServerSearchText('');
    setIsSearchDebouncing(false);
    updateListSearchInUrl({ q: '' });
  };

  const handleCategoryChange = (value: string) => {
    setCategoryId(value);
    updateListSearchInUrl({ categoryId: value });
  };

  const handlePaidByProfileChange = (value: string) => {
    setPaidByProfileId(value);
    updateListSearchInUrl({ paidByProfileId: value });
  };

  const handleFromDateChange = (nextFromDate: string) => {
    const resolvedToDate = toDate && nextFromDate > toDate ? nextFromDate : toDate;
    setFromDate(nextFromDate);
    setToDate(resolvedToDate);
    updateListSearchInUrl({ fromDate: nextFromDate, toDate: resolvedToDate });
  };

  const handleToDateChange = (nextToDate: string) => {
    const resolvedFromDate = fromDate && nextToDate < fromDate ? nextToDate : fromDate;
    setToDate(nextToDate);
    setFromDate(resolvedFromDate);
    updateListSearchInUrl({ fromDate: resolvedFromDate, toDate: nextToDate });
  };

  const hasActiveFilters = useMemo(
    () =>
      categoryId !== 'all' ||
      paidByProfileId !== 'all' ||
      inputSearchText.trim().length > 0 ||
      fromDate !== defaultDateRange.fromDate ||
      toDate !== defaultDateRange.toDate,
    [
      categoryId,
      defaultDateRange.fromDate,
      defaultDateRange.toDate,
      fromDate,
      inputSearchText,
      paidByProfileId,
      toDate,
    ],
  );

  const filters = useMemo(
    () => ({
      categoryId: categoryId === 'all' ? undefined : categoryId,
      paidByProfileId: paidByProfileId === 'all' ? undefined : paidByProfileId,
      searchText: serverSearchText.trim() || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    }),
    [categoryId, fromDate, paidByProfileId, serverSearchText, toDate],
  );

  const clearAllFilters = () => {
    setCategoryId('all');
    setPaidByProfileId('all');
    setInputSearchText('');
    setServerSearchText('');
    setFromDate(defaultDateRange.fromDate);
    setToDate(defaultDateRange.toDate);
    setIsDateRangeOpen(false);
    setIsSearchDebouncing(false);
    navigate({ to: '/expenses/list', search: {}, replace: true });
  };

  const expensesQuery = useExpensesListQuery(filters, { enabled: hasActiveFilters });
  const activityQuery = useExpensesActivityFeedInfiniteQuery(20, { enabled: !hasActiveFilters });

  const expenses = expensesQuery.data ?? [];
  const visibleExpenses = useMemo(() => {
    if (!normalizedInputSearch) return expenses;
    return expenses.filter((expense) => includesNormalizedText(expense.description, normalizedInputSearch));
  }, [expenses, normalizedInputSearch]);

  const activityItems = useMemo(
    () => activityQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [activityQuery.data],
  );
  const emptySubtitle = hasActiveFilters
    ? t('expenses.emptyNoResultsSubtitle')
    : t('expenses.emptyFirstExpense');

  const hasSearchText = inputSearchText.trim().length > 0;
  const isSearchLoading = hasSearchText && (isSearchDebouncing || expensesQuery.isFetching);

  const isInitialPagePending = !hasActiveFilters && activityQuery.isPending;
  const isError = hasActiveFilters ? expensesQuery.isError && !expensesQuery.data : activityQuery.isError;

  if (isInitialPagePending) {
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
        <TextInput
          className="rounded-2xl border-slate-700/45 bg-slate-900/75"
          inputMode="search"
          leading={<span className="material-symbols-outlined text-slate-400">search</span>}
          placeholder={t('expenses.searchExpensesPlaceholder')}
          size="md"
          trailing={
            isSearchLoading ? (
              <span
                aria-label={t('expenses.searchLoading')}
                className="block h-5 w-5 animate-spin rounded-full border-2 border-primary/80 border-t-transparent"
                role="status"
              />
            ) : hasSearchText ? (
              <Button
                aria-label={t('expenses.clearSearch')}
                className="h-8 w-8 text-slate-300 hover:bg-slate-700/50 hover:text-slate-100"
                onClick={clearSearchText}
                size="icon"
                variant="icon"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </Button>
            ) : null
          }
          type="text"
          value={inputSearchText}
          variant="elevated"
          onChange={(event) => handleSearchChange(event.target.value)}
        />

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <SelectInput
            className="min-w-[10.5rem] flex-1"
            leading={<span className="material-symbols-outlined text-slate-300">category</span>}
            selectClassName="text-sm font-semibold"
            size="md"
            value={categoryId}
            variant="chip"
            onChange={(event) => handleCategoryChange(event.target.value)}
          >
            <option value="all">{t('expenses.filterCategory')}</option>
            {(categoriesQuery.data ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {i18n.language.startsWith('es') ? category.name_es : category.name_en}
              </option>
            ))}
          </SelectInput>

          <SelectInput
            className="min-w-[10.5rem] flex-1"
            leading={<span className="material-symbols-outlined text-slate-300">person</span>}
            selectClassName="text-sm font-semibold"
            size="md"
            value={paidByProfileId}
            variant="chip"
            onChange={(event) => handlePaidByProfileChange(event.target.value)}
          >
            <option value="all">{t('expenses.filterPaidBy')}</option>
            {(profilesQuery.data ?? []).map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.id === profileId ? t('expenses.meWithName', { name: profile.name }) : profile.name}
              </option>
            ))}
          </SelectInput>

          <Button
            className="h-11 min-w-[10.5rem] flex-1 justify-start gap-2 rounded-full border-primary/25 bg-[#10223d]/75 px-3 text-sm font-semibold text-slate-100"
            onClick={() => setIsDateRangeOpen((current) => !current)}
            variant="subtle"
          >
            <span className="material-symbols-outlined text-slate-200">calendar_month</span>
            <span className="truncate">{t('expenses.dateRange')}</span>
            <span className="material-symbols-outlined ml-auto text-slate-300">expand_more</span>
          </Button>
        </div>

        {isDateRangeOpen && (
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-primary/20 bg-slate-900/70 p-3">
            <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <span>{t('expenses.dateFrom')}</span>
              <TextInput
                className="h-10 border-primary/25 bg-background-dark"
                max={toDate || undefined}
                size="md"
                type="date"
                value={fromDate}
                variant="surface"
                onChange={(event) => {
                  handleFromDateChange(event.target.value);
                }}
              />
            </label>

            <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <span>{t('expenses.dateTo')}</span>
              <TextInput
                className="h-10 border-primary/25 bg-background-dark"
                min={fromDate || undefined}
                size="md"
                type="date"
                value={toDate}
                variant="surface"
                onChange={(event) => {
                  handleToDateChange(event.target.value);
                }}
              />
            </label>
          </div>
        )}

        {(() => {
          if (hasActiveFilters && expensesQuery.isPending && !expensesQuery.data) {
            return (
              <div className="mt-20 flex flex-col items-center justify-center gap-4 text-center">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm font-medium text-slate-400">{t('expenses.searchLoading')}</p>
              </div>
            );
          }

          const isEmpty = hasActiveFilters ? visibleExpenses.length === 0 : activityItems.length === 0;

          if (isEmpty) {
            return (
              <div className="mt-10 flex flex-col items-center px-2 text-center">
                <Card className="relative flex h-52 w-52 items-center justify-center rounded-full border-primary/20 bg-slate-900/35 shadow-[0_0_120px_rgba(23,207,145,0.12)]" padding="none" radius="3xl" variant="surface">
                  <span className="material-symbols-outlined filled-icon !text-7xl text-primary/55">
                    receipt_long
                  </span>
                  <div className="absolute right-6 top-5 flex h-12 w-12 items-center justify-center rounded-full border border-primary/25 bg-slate-900">
                    <span className="material-symbols-outlined text-xl text-primary">search_off</span>
                  </div>
                </Card>

                <h2 className="mt-8 text-[2.1rem] font-black tracking-tight text-slate-100">
                  {t('expenses.emptyNoResultsTitle')}
                </h2>
                <p className="mt-3 max-w-sm text-lg leading-relaxed text-slate-300">{emptySubtitle}</p>

                <Button
                  className="mt-8 h-16 w-full max-w-[22rem] gap-2 rounded-3xl px-6 text-lg font-black shadow-[0_20px_40px_-16px_rgba(23,207,145,0.65)]"
                  onClick={() => navigate({ to: '/expenses/new' })}
                  size="lg"
                >
                  <span className="material-symbols-outlined text-3xl">add</span>
                  <span>{t('expenses.addExpense')}</span>
                </Button>

                {hasActiveFilters && (
                  <Button
                    className="mt-5 h-auto px-0 py-0 text-lg font-bold text-primary"
                    onClick={clearAllFilters}
                    size="sm"
                    variant="ghost"
                  >
                    {t('expenses.clearAllFilters')}
                  </Button>
                )}
              </div>
            );
          }

          return (
            <div className="mt-6">
              <ExpensesList
                currentProfileId={profileId}
                expenses={hasActiveFilters ? visibleExpenses : undefined}
                hasNextPage={!hasActiveFilters ? activityQuery.hasNextPage : undefined}
                isFetchingNextPage={!hasActiveFilters ? activityQuery.isFetchingNextPage : undefined}
                items={!hasActiveFilters ? activityItems : undefined}
                locale={i18n.language}
                onLoadMore={() => {
                  if (!hasActiveFilters && activityQuery.hasNextPage && !activityQuery.isFetchingNextPage) {
                    void activityQuery.fetchNextPage();
                  }
                }}
                onExpenseClick={(expenseId) =>
                  navigate({
                    to: '/expenses/$expenseId',
                    params: { expenseId },
                    search: detailSearchFromList,
                  })
                }
              />
            </div>
          );
        })()}
      </main>
    </div>
  );
}
