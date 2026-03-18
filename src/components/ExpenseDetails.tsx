import React, { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import TopBar from './ui/TopBar';
import QueryErrorState from './ui/QueryErrorState';
import { NumericInput } from './ui/NumericInput';
import {
  useAuthScope,
  useDeleteExpenseMutation,
  useExpenseByIdQuery,
  useExpenseCategoriesQuery,
  useProfilesQuery,
  useUpdateExpenseMutation,
} from '../lib/queryHooks';
import { centsToCurrency } from '../lib/expenseUtils';
import { expenseFormSchema, type ExpenseFormValues } from '../lib/schemas';
import type { ExpenseDetailsSearch, ExpensesListSearch } from '../router';

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

function inputToCents(value: string): number {
  const normalized = value.replace(',', '.').trim();
  const numeric = Number.parseFloat(normalized);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.round(numeric * 100);
}

export default function ExpenseDetails() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { expenseId } = useParams({ strict: false }) as { expenseId: string };
  const detailSearch = useSearch({ strict: false }) as Partial<ExpenseDetailsSearch>;
  const { profileId } = useAuthScope();

  const listSearch = useMemo<ExpensesListSearch>(() => {
    const search: ExpensesListSearch = {};

    if (typeof detailSearch.q === 'string' && detailSearch.q.trim().length > 0) {
      search.q = detailSearch.q.trim();
    }

    if (typeof detailSearch.categoryId === 'string' && detailSearch.categoryId.trim().length > 0) {
      search.categoryId = detailSearch.categoryId.trim();
    }

    if (typeof detailSearch.paidByProfileId === 'string' && detailSearch.paidByProfileId.trim().length > 0) {
      search.paidByProfileId = detailSearch.paidByProfileId.trim();
    }

    if (typeof detailSearch.fromDate === 'string' && detailSearch.fromDate.trim().length > 0) {
      search.fromDate = detailSearch.fromDate.trim();
    }

    if (typeof detailSearch.toDate === 'string' && detailSearch.toDate.trim().length > 0) {
      search.toDate = detailSearch.toDate.trim();
    }

    return search;
  }, [detailSearch.categoryId, detailSearch.fromDate, detailSearch.paidByProfileId, detailSearch.q, detailSearch.toDate]);

  const goBackToExpenses = () => {
    if (detailSearch.from === 'list') {
      navigate({ to: '/expenses/list', search: listSearch });
      return;
    }

    navigate({ to: '/expenses' });
  };

  const expenseQuery = useExpenseByIdQuery(expenseId);
  const categoriesQuery = useExpenseCategoriesQuery();
  const profilesQuery = useProfilesQuery();
  const updateExpenseMutation = useUpdateExpenseMutation();
  const deleteExpenseMutation = useDeleteExpenseMutation();

  const expense = expenseQuery.data;

  const {
    control,
    watch,
    register,
    setValue,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amountInput: '',
      description: '',
      categoryId: '',
      paidByProfileId: '',
      expenseDate: '',
    },
  });

  const [isEditing, setIsEditing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const amountInput = watch('amountInput');

  const amountCents = useMemo(() => inputToCents(amountInput), [amountInput]);

  function loadForm() {
    if (!expense) return;
    reset({
      amountInput: centsToInput(expense.amount_cents),
      description: expense.description ?? '',
      categoryId: expense.category_id,
      paidByProfileId: expense.paid_by_profile_id,
      expenseDate: expense.expense_date,
    });
  }

  async function handleDelete() {
    if (!expense) return;
    if (!window.confirm(t('expenses.confirmDelete'))) return;

    setActionError(null);
    try {
      await deleteExpenseMutation.mutateAsync(expense.id);
      goBackToExpenses();
    } catch (error) {
      console.error('Delete expense error:', error);
      setActionError(t('queryState.mutationError'));
    }
  }

  const handleSave = handleSubmit(async (values) => {
    if (!expense) return;

    const parsedAmountCents = inputToCents(values.amountInput);
    if (parsedAmountCents <= 0) return;

    setActionError(null);
    try {
      await updateExpenseMutation.mutateAsync({
        expenseId: expense.id,
        input: {
          amountCents: parsedAmountCents,
          description: values.description,
          categoryId: values.categoryId,
          paidByProfileId: values.paidByProfileId,
          expenseDate: values.expenseDate,
        },
      });

      setIsEditing(false);
    } catch (error) {
      console.error('Update expense error:', error);
      setActionError(t('queryState.mutationError'));
    }
  });

  if (expenseQuery.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (expenseQuery.isError) {
    return <QueryErrorState onRetry={() => expenseQuery.refetch()} />;
  }

  if (!expense) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-slate-300">{t('expenses.notFound')}</p>
        <button className="font-semibold text-primary" onClick={goBackToExpenses} type="button">
          {t('taskDetails.back')}
        </button>
      </div>
    );
  }

  const amountLabel = centsToCurrency(expense.amount_cents, i18n.language);
  const categoryLabel = i18n.language.startsWith('es')
    ? expense.category?.name_es ?? t('expenses.categoryFallback')
    : expense.category?.name_en ?? t('expenses.categoryFallback');

  return (
    <div className="min-h-screen pb-24">
      <TopBar
        title={t('expenses.expenseDetail')}
        leftAction={{
          ariaLabel: t('topBar.back'),
          icon: 'arrow_back',
          onClick: goBackToExpenses,
        }}
        rightSlot={(
          <button
            aria-label={t('expenses.deleteExpense')}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-200 hover:bg-primary/10"
            onClick={handleDelete}
            type="button"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        )}
      />

      <main className="mx-auto max-w-md px-4 pt-6">
        {actionError && (
          <p className="mb-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-100">
            {actionError}
          </p>
        )}

        <section className="rounded-3xl border border-primary/20 bg-primary/10 p-6">
          <p className="text-center text-7xl font-black text-slate-100">{amountLabel}</p>
          <p className="mt-3 text-center text-2xl text-slate-300">{expense.description || categoryLabel}</p>

          <div className="mt-8 space-y-4 rounded-2xl border border-primary/15 bg-background-dark/30 p-4">
            <div className="flex items-center justify-between border-b border-primary/10 pb-3">
              <span className="text-slate-400">{t('expenses.paidBy')}</span>
              <span className="font-semibold text-slate-100">
                {expense.paid_by_profile_id === profileId
                  ? t('expenses.meWithName', { name: expense.paid_by_profile?.name ?? t('expenses.me') })
                  : expense.paid_by_profile?.name}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-primary/10 pb-3">
              <span className="text-slate-400">{t('expenses.category')}</span>
              <span className="font-semibold text-slate-100">{categoryLabel}</span>
            </div>
            <div className="flex items-center justify-between border-b border-primary/10 pb-3">
              <span className="text-slate-400">{t('expenses.splitTitle')}</span>
              <span className="font-semibold text-slate-100">{t('expenses.splitShared')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{t('expenses.date')}</span>
              <span className="font-semibold text-slate-100">
                {new Date(`${expense.expense_date}T12:00:00`).toLocaleDateString(i18n.language, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </section>

        {isEditing && (
          <section className="mt-5 space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <Controller
              name="amountInput"
              control={control}
              render={({ field }) => (
                <NumericInput
                  {...field}
                  className="h-12 w-full rounded-xl border border-primary/20 bg-background-dark px-3 text-sm"
                />
              )}
            />
            {errors.amountInput && <p className="text-xs text-red-400">{t(errors.amountInput.message!)}</p>}
            <input
              className="h-12 w-full rounded-xl border border-primary/20 bg-background-dark px-3 text-sm"
              placeholder={t('expenses.descriptionPlaceholder')}
              {...register('description')}
            />
            <select
              className="h-12 w-full rounded-xl border border-primary/20 bg-background-dark px-3 text-sm"
              {...register('categoryId')}
            >
              {(categoriesQuery.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {i18n.language.startsWith('es') ? category.name_es : category.name_en}
                </option>
              ))}
            </select>
            {errors.categoryId && <p className="text-xs text-red-400">{t(errors.categoryId.message!)}</p>}
            <select
              className="h-12 w-full rounded-xl border border-primary/20 bg-background-dark px-3 text-sm"
              {...register('paidByProfileId')}
            >
              {(profilesQuery.data ?? []).map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.id === profileId ? t('expenses.meWithName', { name: profile.name }) : profile.name}
                </option>
              ))}
            </select>
            {errors.paidByProfileId && <p className="text-xs text-red-400">{t(errors.paidByProfileId.message!)}</p>}
            <input
              className="h-12 w-full rounded-xl border border-primary/20 bg-background-dark px-3 text-sm"
              type="date"
              {...register('expenseDate')}
            />
            {errors.expenseDate && <p className="text-xs text-red-400">{t(errors.expenseDate.message!)}</p>}
          </section>
        )}
      </main>

      <div className="fixed bottom-24 left-0 right-0 px-4">
        <div className="mx-auto max-w-md">
          {isEditing ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                className="h-12 rounded-2xl border border-primary/20 text-sm font-semibold text-slate-300"
                onClick={() => setIsEditing(false)}
                type="button"
              >
                {t('cta.cancel')}
              </button>
              <button
                className="h-12 rounded-2xl bg-primary text-lg font-bold text-background-dark disabled:opacity-50"
                disabled={amountCents <= 0 || updateExpenseMutation.isPending}
                onClick={handleSave}
                type="button"
              >
                {updateExpenseMutation.isPending ? t('common.saving') : t('expenses.saveExpense')}
              </button>
            </div>
          ) : (
            <button
              className="h-14 w-full rounded-2xl bg-primary text-2xl font-bold text-background-dark"
              onClick={() => {
                setActionError(null);
                loadForm();
                setIsEditing(true);
              }}
              type="button"
            >
              {t('expenses.editExpense')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
