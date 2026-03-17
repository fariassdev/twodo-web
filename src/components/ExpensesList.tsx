import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import TopBar from './ui/TopBar';
import QueryErrorState from './ui/QueryErrorState';
import ExpenseListItem from './expenses/ExpenseListItem';
import { formatMonthHeading, getMonthInputValue, groupExpensesByMonth } from '../lib/expenseUtils';
import {
  useAuthScope,
  useExpenseCategoriesQuery,
  useExpensesListQuery,
  useProfilesQuery,
} from '../lib/queryHooks';

export default function ExpensesList() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profileId } = useAuthScope();

  const categoriesQuery = useExpenseCategoriesQuery();
  const profilesQuery = useProfilesQuery();

  const [categoryId, setCategoryId] = useState<string>('all');
  const [paidByProfileId, setPaidByProfileId] = useState<string>('all');
  const [month, setMonth] = useState<string>(getMonthInputValue());
  const [sharedFilter, setSharedFilter] = useState<'all' | 'shared' | 'personal'>('all');

  const filters = useMemo(
    () => ({
      categoryId: categoryId === 'all' ? undefined : categoryId,
      paidByProfileId: paidByProfileId === 'all' ? undefined : paidByProfileId,
      month,
      sharedOnly: sharedFilter === 'all' ? undefined : sharedFilter === 'shared',
    }),
    [categoryId, month, paidByProfileId, sharedFilter],
  );

  const expensesQuery = useExpensesListQuery(filters);

  const expenses = expensesQuery.data ?? [];
  const groups = groupExpensesByMonth(expenses);

  if (expensesQuery.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (expensesQuery.isError) {
    return <QueryErrorState onRetry={() => expensesQuery.refetch()} />;
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

      <main className="mx-auto max-w-md px-4 pt-4">
        <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
          <div className="grid grid-cols-2 gap-2">
            <select
              className="h-11 rounded-xl border border-primary/20 bg-background-dark px-3 text-sm"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="all">{t('expenses.filterAllCategories')}</option>
              {(categoriesQuery.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {i18n.language.startsWith('es') ? category.name_es : category.name_en}
                </option>
              ))}
            </select>

            <select
              className="h-11 rounded-xl border border-primary/20 bg-background-dark px-3 text-sm"
              value={paidByProfileId}
              onChange={(event) => setPaidByProfileId(event.target.value)}
            >
              <option value="all">{t('expenses.filterAllPeople')}</option>
              {(profilesQuery.data ?? []).map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.id === profileId ? t('expenses.meWithName', { name: profile.name }) : profile.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              className="h-11 rounded-xl border border-primary/20 bg-background-dark px-3 text-sm"
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />

            <div className="grid grid-cols-3 gap-1 rounded-xl border border-primary/20 bg-background-dark p-1">
              <button
                className={`rounded-lg text-xs font-semibold ${sharedFilter === 'all' ? 'bg-primary text-background-dark' : 'text-slate-300'}`}
                onClick={() => setSharedFilter('all')}
                type="button"
              >
                {t('expenses.filterAll')}
              </button>
              <button
                className={`rounded-lg text-xs font-semibold ${sharedFilter === 'shared' ? 'bg-primary text-background-dark' : 'text-slate-300'}`}
                onClick={() => setSharedFilter('shared')}
                type="button"
              >
                {t('expenses.filterShared')}
              </button>
              <button
                className={`rounded-lg text-xs font-semibold ${sharedFilter === 'personal' ? 'bg-primary text-background-dark' : 'text-slate-300'}`}
                onClick={() => setSharedFilter('personal')}
                type="button"
              >
                {t('expenses.filterPersonal')}
              </button>
            </div>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center text-sm text-slate-300">
            {t('expenses.emptyFiltered')}
          </div>
        ) : (
          <div className="mt-6 space-y-7">
            {groups.map((group) => (
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
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
