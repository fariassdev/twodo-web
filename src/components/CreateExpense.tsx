import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import TopBar from './ui/TopBar';
import {
  useAuthScope,
  useCreateExpenseMutation,
  useExpenseCategoriesQuery,
  useProfilesQuery,
} from '../lib/queryHooks';
import { expenseFormSchema, type ExpenseFormValues } from '../lib/schemas';

function parseAmountToCents(raw: string): number {
  const normalized = raw.replace(',', '.').trim();
  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * 100);
}

export default function CreateExpense() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profileId } = useAuthScope();

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amountInput: '',
      description: '',
      categoryId: '',
      paidByProfileId: '',
      isShared: true,
      expenseDate: new Date().toISOString().slice(0, 10),
    },
  });

  const categoriesQuery = useExpenseCategoriesQuery();
  const profilesQuery = useProfilesQuery();
  const createExpenseMutation = useCreateExpenseMutation();

  const categories = categoriesQuery.data ?? [];
  const profiles = profilesQuery.data ?? [];

  // Ensure the other household member is displayed first while keeping the current user selected.
  const orderedProfiles = useMemo(() => {
    if (!profileId || profiles.length <= 1) return profiles;
    const meIndex = profiles.findIndex((profile) => profile.id === profileId);
    if (meIndex === -1) return profiles;

    const sorted = [...profiles];
    const [me] = sorted.splice(meIndex, 1);
    return [me, ...sorted];
  }, [profiles, profileId]);

  const amountInput = watch('amountInput');
  const selectedCategoryId = watch('categoryId');
  const paidByProfileId = watch('paidByProfileId');
  const isShared = watch('isShared');
  const expenseDate = watch('expenseDate');

  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      setValue('categoryId', categories[0].id, { shouldValidate: true });
    }
  }, [categories, selectedCategoryId, setValue]);

  useEffect(() => {
    if (!paidByProfileId && profiles.length > 0) {
      const defaultPayer = profiles.find((profile) => profile.id === profileId) ?? profiles[0];
      setValue('paidByProfileId', defaultPayer.id, { shouldValidate: true });
    }
  }, [paidByProfileId, profileId, profiles, setValue]);

  const amountCents = useMemo(() => parseAmountToCents(amountInput), [amountInput]);
  const canSubmit = amountCents > 0 && Boolean(selectedCategoryId) && Boolean(paidByProfileId) && Boolean(expenseDate);

  const handleSave = handleSubmit(async (values) => {
    const parsedAmountCents = parseAmountToCents(values.amountInput);
    if (parsedAmountCents <= 0) return;

    setActionError(null);
    try {
      const created = await createExpenseMutation.mutateAsync({
        amountCents: parsedAmountCents,
        categoryId: values.categoryId,
        paidByProfileId: values.paidByProfileId,
        description: values.description,
        expenseDate: values.expenseDate,
        isShared: values.isShared,
      });

      navigate({ to: '/expenses/$expenseId', params: { expenseId: created.id } });
    } catch (error) {
      console.error('Create expense error:', error);
      setActionError(t('queryState.mutationError'));
    }
  });

  return (
    <div className="min-h-screen">
      <TopBar
        title={t('expenses.newExpense')}
        leftAction={{
          ariaLabel: t('topBar.back'),
          icon: 'arrow_back',
          onClick: () => navigate({ to: '/expenses' }),
        }}
        rightSlot={(
          <button
            aria-label={t('cta.save')}
            className="flex min-h-10 items-center justify-end text-base font-bold tracking-[0.015em] text-primary transition-colors disabled:cursor-not-allowed disabled:text-primary/40"
            disabled={!canSubmit || createExpenseMutation.isPending}
            onClick={handleSave}
            type="button"
          >
            {createExpenseMutation.isPending ? t('common.saving') : t('cta.save')}
          </button>
        )}
      />

      <main className="mx-auto max-w-md px-4 pb-12 pt-6">
        {actionError && (
          <p className="mb-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-100">
            {actionError}
          </p>
        )}

        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
          <label className="text-sm uppercase tracking-wider text-primary/80">{t('expenses.amount')}</label>
          <div className="mt-2 flex items-end gap-2">
            <span className="pb-2 text-5xl font-bold text-slate-200">€</span>
            <input
              autoFocus
              className="h-16 w-full border-b border-primary/30 bg-transparent text-6xl font-black tracking-tight text-slate-100 focus:outline-none"
              inputMode="decimal"
              placeholder="0.00"
              {...register('amountInput')}
            />
          </div>
          {errors.amountInput && <p className="mt-2 text-xs text-red-400">{t(errors.amountInput.message!)}</p>}
        </div>

        <label className="mt-6 block text-sm font-semibold uppercase tracking-wide text-slate-300">
          {t('expenses.description')}
        </label>
        <input
          className="mt-2 h-14 w-full rounded-xl border border-primary/20 bg-primary/5 px-4 text-base text-slate-100 placeholder:text-slate-500"
          placeholder={t('expenses.descriptionPlaceholder')}
          {...register('description')}
        />

        <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-300">{t('expenses.category')}</p>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => {
            const active = selectedCategoryId === category.id;
            const label = i18n.language.startsWith('es') ? category.name_es : category.name_en;

            return (
              <button
                key={category.id}
                className={`flex h-12 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
                  active
                    ? 'border-primary bg-primary text-background-dark'
                    : 'border-primary/20 bg-primary/5 text-slate-300'
                }`}
                onClick={() => setValue('categoryId', category.id, { shouldValidate: true })}
                type="button"
              >
                <span className="material-symbols-outlined text-base">{category.icon}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        {errors.categoryId && <p className="mt-2 text-xs text-red-400">{t(errors.categoryId.message!)}</p>}

        <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-300">{t('expenses.paidBy')}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-1">
          {orderedProfiles.map((profile) => {
            const active = paidByProfileId === profile.id;
            return (
              <button
                key={profile.id}
                className={`h-12 rounded-xl text-sm font-bold transition-colors ${
                  active ? 'bg-primary text-background-dark' : 'text-slate-300'
                }`}
                onClick={() => setValue('paidByProfileId', profile.id, { shouldValidate: true })}
                type="button"
              >
                {profile.id === profileId ? t('expenses.meWithName', { name: profile.name }) : profile.name}
              </button>
            );
          })}
        </div>
        {errors.paidByProfileId && <p className="mt-2 text-xs text-red-400">{t(errors.paidByProfileId.message!)}</p>}

        <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-300">{t('expenses.splitTitle')}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-1">
          <button
            className={`h-12 rounded-xl text-sm font-bold transition-colors ${
              isShared ? 'bg-primary text-background-dark' : 'text-slate-300'
            }`}
            onClick={() => setValue('isShared', true)}
            type="button"
          >
            {t('expenses.splitShared')}
          </button>
          <button
            className={`h-12 rounded-xl text-sm font-bold transition-colors ${
              !isShared ? 'bg-primary text-background-dark' : 'text-slate-300'
            }`}
            onClick={() => setValue('isShared', false)}
            type="button"
          >
            {t('expenses.splitOnlyMe')}
          </button>
        </div>

        {!isShared && (
          <p className="mt-2 text-xs text-slate-400">{t('expenses.personalExpenseHint')}</p>
        )}

        <label className="mt-6 block text-sm font-semibold uppercase tracking-wide text-slate-300">
          {t('expenses.date')}
        </label>
        <input
          className="mt-2 h-14 w-full rounded-xl border border-primary/20 bg-primary/5 px-4 text-base text-slate-100"
          type="date"
          {...register('expenseDate')}
        />
        {errors.expenseDate && <p className="mt-2 text-xs text-red-400">{t(errors.expenseDate.message!)}</p>}
      </main>
    </div>
  );
}
