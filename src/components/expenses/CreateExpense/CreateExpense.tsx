import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PageHeader from '../../ui/PageHeader';
import Button from '../../ui/Button';
import ErrorBanner from '../../ui/ErrorBanner';
import FormField from '../../ui/FormField';
import { NumericInput } from '../../ui/NumericInput';
import TextInput from '../../ui/TextInput';
import ScrollContainer from '../../ui/ScrollContainer/ScrollContainer';
import {
  useAuthScope,
  useCreateExpenseMutation,
  useExpenseCategoriesQuery,
  useProfilesQuery,
} from '../../../lib/queryHooks';
import { expenseFormSchema, type ExpenseFormValues } from '../../../helpers/schemas';
import { cn } from '../../../utils';

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
    control,
    watch,
    register,
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
      });

      navigate({ to: '/expenses/$expenseId', params: { expenseId: created.id } });
    } catch (error) {
      console.error('Create expense error:', error);
      setActionError(t('queryState.mutationError'));
    }
  });

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <PageHeader
        title={t('expenses.newExpense')}
        subtitle={t('nav.expenses')}
        backAction={{
          onClick: () => navigate({ to: '/expenses' }),
        }}
        rightSlot={(
          <Button
            aria-label={t('cta.save')}
            className="min-h-10 justify-end px-0 text-base font-bold tracking-[0.015em] text-primary disabled:text-primary/40"
            disabled={!canSubmit || createExpenseMutation.isPending}
            onClick={handleSave}
            size="sm"
            variant="ghost"
          >
            {createExpenseMutation.isPending ? t('common.saving') : t('cta.save')}
          </Button>
        )}
      />

      <main className="mx-auto max-w-md px-6 pb-12 pt-6">
        {actionError ? <ErrorBanner className="mb-6" message={actionError} /> : null}

        <div className="relative mb-10 pt-4 text-center">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-primary/5 blur-3xl z-0" />
          
          <label className="relative z-10 text-[10px] font-black uppercase tracking-[0.2em] text-surface-2/30 mb-2 block">
            {t('expenses.amount')}
          </label>
          
          <div className="relative z-10 flex flex-col items-center justify-center">
            <div className="flex items-start leading-none gap-[0.5rem]">
              <span className="font-sans text-[clamp(1.5rem,6vw,2.5rem)] font-light text-surface-2/20 pt-[0.4rem]">
                €
              </span>
              <Controller
                name="amountInput"
                control={control}
                render={({ field }) => (
                  <NumericInput
                    {...field}
                    autoFocus
                    className="w-full min-w-[120px] max-w-[280px] bg-transparent text-center font-display text-[clamp(5rem,22vw,7.5rem)] font-normal tracking-[-0.02em] leading-[0.9] tabular-nums text-surface-2 focus:outline-none italic"
                    placeholder="0.00"
                  />
                )}
              />
            </div>
            {errors.amountInput && <p className="mt-6 text-xs font-bold text-danger uppercase tracking-wider">{t(errors.amountInput.message!)}</p>}
          </div>
        </div>

        <FormField 
          className="mt-10" 
          label={t('expenses.description')}
          labelClassName="text-[10px] font-black uppercase tracking-[0.2em] text-surface-2/30 mb-4 px-2"
        >
          <TextInput
            placeholder={t('expenses.descriptionPlaceholder')}
            size="lg"
            type="text"
            variant="soft"
            className="rounded-2xl border-border-subtle bg-surface-1/50"
            {...register('description')}
          />
        </FormField>

        <div className="mt-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-2/30 mb-4 px-2">
            {t('expenses.category')}
          </p>
          <ScrollContainer className="-mx-2 px-2">
            <div className="flex gap-3 pb-2">
              {categories.map((category) => {
                const active = selectedCategoryId === category.id;
                const label = i18n.language.startsWith('es') ? category.name_es : category.name_en;

                return (
                  <button
                    key={category.id}
                    className={cn(
                      "flex h-14 shrink-0 items-center gap-2.5 rounded-2xl border px-5 text-sm font-bold transition-all duration-300",
                      active
                        ? "border-primary bg-primary/10 text-primary shadow-glow-primary/5"
                        : "border-border-subtle bg-surface-1/40 text-surface-2/40 hover:bg-surface-1 hover:border-primary/20"
                    )}
                    onClick={() => setValue('categoryId', category.id, { shouldValidate: true })}
                    type="button"
                  >
                    <span className={cn(
                      "material-symbols-outlined text-xl transition-transform duration-300",
                      active && "scale-110 filled-icon"
                    )}>
                      {category.icon}
                    </span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </ScrollContainer>
          {errors.categoryId && <p className="mt-2 text-xs font-bold text-danger uppercase tracking-wider px-2">{t(errors.categoryId.message!)}</p>}
        </div>

        <div className="mt-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-2/30 mb-6 text-center">
            {t('expenses.paidBy')}
          </p>
          <div className="grid grid-cols-2 gap-4">
            {orderedProfiles.map((profile) => {
              const active = paidByProfileId === profile.id;
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => setValue('paidByProfileId', profile.id, { shouldValidate: true })}
                  className={cn(
                    "relative flex flex-col items-center justify-center p-6 rounded-[32px] transition-all duration-300 group",
                    active
                      ? "bg-primary/10 ring-2 ring-primary shadow-glow-primary/20"
                      : "bg-surface-1/40 border border-border-subtle hover:bg-surface-1 hover:border-primary/30"
                  )}
                >
                  <div className={cn(
                    "w-16 h-16 rounded-2xl overflow-hidden transition-all duration-300 mb-3 border-2",
                    active 
                      ? "border-primary shadow-glow-primary scale-110" 
                      : "border-surface-2/10 group-hover:border-primary/30"
                  )}>
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.name || ''} className="w-full h-full object-cover" />
                    ) : (
                      <div className={cn(
                        "w-full h-full flex items-center justify-center text-xl font-bold",
                        active ? "bg-primary text-surface-1" : "bg-surface-2/5 text-surface-2/40"
                      )}>
                        {profile.name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <span className={cn(
                    "text-sm font-bold tracking-tight",
                    active ? "text-primary" : "text-surface-2/60"
                  )}>
                    {profile.id === profileId ? t('expenses.me') : profile.name}
                  </span>
                  
                  {active && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-primary text-surface-1 rounded-full flex items-center justify-center shadow-md animate-in zoom-in duration-300">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {errors.paidByProfileId && <p className="mt-4 text-xs font-bold text-danger uppercase tracking-wider text-center">{t(errors.paidByProfileId.message!)}</p>}
        </div>

        <FormField 
          className="mt-10" 
          label={t('expenses.date')}
          labelClassName="text-[10px] font-black uppercase tracking-[0.2em] text-surface-2/30 mb-4 px-2"
        >
          <TextInput 
            size="lg" 
            type="date" 
            variant="soft" 
            className="rounded-2xl border-border-subtle bg-surface-1/50"
            {...register('expenseDate')} 
          />
        </FormField>
        {errors.expenseDate && <p className="mt-2 text-xs font-bold text-danger uppercase tracking-wider px-2">{t(errors.expenseDate.message!)}</p>}
      </main>
    </div>
  );
}
