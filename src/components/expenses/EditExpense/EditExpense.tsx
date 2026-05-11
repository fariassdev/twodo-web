import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Check, Calendar, Tag, User } from 'lucide-react';
import PageHeader from '../../ui/PageHeader';
import Button from '../../ui/Button';
import ErrorBanner from '../../ui/ErrorBanner';
import FormField from '../../ui/FormField';
import { NumericInput } from '../../ui/NumericInput';
import TextInput from '../../ui/TextInput';
import ScrollContainer from '../../ui/ScrollContainer/ScrollContainer';
import FullPageLoading from '../../ui/FullPageLoading';
import {
  useAuthScope,
  useUpdateExpenseMutation,
  useExpenseCategoriesQuery,
  useProfilesQuery,
  useExpenseByIdQuery,
} from '../../../lib/queryHooks';
import { expenseFormSchema, type ExpenseFormValues } from '../../../helpers/schemas';
import { cn } from '../../../utils';

function parseAmountToCents(raw: string): number {
  const normalized = raw.replace(',', '.').trim();
  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * 100);
}

const centsToInput = (cents: number) => (cents / 100).toFixed(2);

export default function EditExpense() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { expenseId } = useParams({ strict: false }) as { expenseId: string };
  const { profileId } = useAuthScope();

  const expenseQuery = useExpenseByIdQuery(expenseId);
  const categoriesQuery = useExpenseCategoriesQuery();
  const profilesQuery = useProfilesQuery();
  const updateExpenseMutation = useUpdateExpenseMutation();

  const expense = expenseQuery.data;
  const categories = categoriesQuery.data ?? [];
  const profiles = profilesQuery.data ?? [];

  const {
    control,
    watch,
    register,
    setValue,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
  });

  const [hasInitialized, setHasInitialized] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (expense && !hasInitialized) {
      reset({
        amountInput: centsToInput(expense.amount_cents),
        description: expense.description || '',
        categoryId: expense.category_id,
        paidByProfileId: expense.paid_by_profile_id,
        expenseDate: expense.expense_date,
      });
      setHasInitialized(true);
    }
  }, [expense, reset, hasInitialized]);

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

  const amountCents = useMemo(() => parseAmountToCents(amountInput || ''), [amountInput]);
  const canSubmit = amountCents > 0 && Boolean(selectedCategoryId) && Boolean(paidByProfileId) && Boolean(expenseDate);

  const handleSave = handleSubmit(async (values) => {
    const parsedAmountCents = parseAmountToCents(values.amountInput);
    if (parsedAmountCents <= 0) return;

    setActionError(null);
    try {
      await updateExpenseMutation.mutateAsync({
        expenseId,
        input: {
          amountCents: parsedAmountCents,
          categoryId: values.categoryId,
          paidByProfileId: values.paidByProfileId,
          description: values.description,
          expenseDate: values.expenseDate,
        },
      });

      navigate({ 
        to: '/expenses/$expenseId', 
        params: { expenseId },
        search: (prev) => prev
      });
    } catch (error) {
      console.error('Update expense error:', error);
      setActionError(t('queryState.mutationError'));
    }
  });

  if (expenseQuery.isPending || !hasInitialized) {
    return <FullPageLoading message={t('loading')} />;
  }

  if (expenseQuery.isError || !expense) {
    return (
      <div className="flex flex-col h-dvh bg-background-light dark:bg-background-dark">
        <PageHeader title={t('expenses.editExpense')} backAction={{ onClick: () => navigate({ to: '/expenses' }) }} />
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <p className="text-surface-2/40 font-bold uppercase tracking-widest">{t('expenses.notFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background-light dark:bg-background-dark animate-in fade-in slide-in-from-right duration-300">
      <PageHeader
        title={t('expenses.editExpense')}
        subtitle={t('nav.expenses')}
        showAvatars={false}
        backAction={{
          onClick: () => navigate({ 
            to: '/expenses/$expenseId', 
            params: { expenseId },
            search: (prev) => prev
          }),
        }}
      />

      <div className="relative flex-1 overflow-y-auto custom-scrollbar px-6 pb-32 pt-6">
        {/* Category Hero Background Icon */}
        <div className="absolute top-[-20px] right-[-40px] opacity-[0.03] pointer-events-none select-none z-0 -rotate-12">
          <span className="material-symbols-outlined text-[320px] font-light">
            {categories.find(c => c.id === selectedCategoryId)?.icon || 'payments'}
          </span>
        </div>

        <main className="relative z-10 mx-auto max-w-md">
          {actionError ? <ErrorBanner className="mb-6" message={actionError} /> : null}

          {/* Hero Amount Input */}
          <div className="mt-4">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-2/30 mb-2 block">
              {t('expenses.amount')}
            </span>
            <div className="flex items-center gap-[0.5rem] leading-none">
              <Controller
                name="amountInput"
                control={control}
                render={({ field }) => (
                  <NumericInput
                    {...field}
                    autoFocus
                    className="bg-transparent font-display text-[clamp(3.5rem,18vw,6rem)] font-normal tracking-[-0.02em] leading-[0.9] tabular-nums text-surface-2 focus:outline-none italic w-[220px]"
                    placeholder="0.00"
                  />
                )}
              />
              <span className="font-sans text-[clamp(1.5rem,6vw,2.5rem)] font-light text-surface-2/20 pt-[0.4rem]">
                €
              </span>
            </div>
            {errors.amountInput?.message && (
              <p className="mt-4 text-xs font-bold text-danger uppercase tracking-wider">
                {t(errors.amountInput.message)}
              </p>
            )}
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Description Input (Compact, no label) */}
            <div className="mb-8">
              <TextInput
                {...register('description')}
                placeholder={t('expenses.descriptionPlaceholder')}
                type="text"
                variant="editorial"
                className="text-xl font-medium"
              />
            </div>

            {/* Category Selection (Moved up to see overlay change) */}
            <div className="mb-10">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-2/30 mb-3 px-1 block">
                {t('expenses.category')}
              </span>
              <ScrollContainer className="-mx-2 px-2" scrollClassName="pb-2">
                <div className="flex gap-2.5">
                  {categories.map((category) => {
                    const active = selectedCategoryId === category.id;
                    const label = i18n.language.startsWith('es') ? category.name_es : category.name_en;

                    return (
                      <button
                        key={category.id}
                        className={cn(
                          "flex h-12 shrink-0 items-center gap-2 rounded-2xl border px-4 text-sm font-bold transition-all duration-300",
                          active
                            ? "border-primary bg-primary/10 text-primary shadow-glow-primary/5"
                            : "border-border-subtle bg-surface-1/40 text-surface-2/40 hover:bg-surface-1 hover:border-primary/20"
                        )}
                        onClick={() => setValue('categoryId', category.id, { shouldValidate: true })}
                        type="button"
                      >
                        <span className={cn(
                          "material-symbols-outlined text-lg transition-transform duration-300",
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
              {errors.categoryId && (
                <p className="mt-2 text-xs font-bold text-danger uppercase tracking-wider px-1">
                  {t(errors.categoryId.message!)}
                </p>
              )}
            </div>

            {/* Paid By Selection */}
            <div className="bg-surface-1/40 border border-border-subtle rounded-2xl p-6 mb-10">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-2/40 block mb-6 text-center">
                {t('expenses.paidBy')}
              </span>
              <div className="grid grid-cols-2 gap-4">
                {orderedProfiles.map((profile) => {
                  const active = paidByProfileId === profile.id;
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => setValue('paidByProfileId', profile.id, { shouldValidate: true })}
                      className={cn(
                        "relative flex flex-col items-center justify-center p-5 rounded-[28px] transition-all duration-300 group",
                        active
                          ? "bg-primary/10 ring-2 ring-primary shadow-glow-primary/20"
                          : "bg-surface-1 border border-border-subtle hover:bg-surface-1 hover:border-primary/30"
                      )}
                    >
                      <div className={cn(
                        "w-14 h-14 rounded-2xl overflow-hidden transition-all duration-300 mb-3 border-2",
                        active 
                          ? "border-primary shadow-glow-primary scale-105" 
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
                        {profile.id === profileId ? t('common.me') : profile.name}
                      </span>
                      
                      {active && (
                        <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-primary text-surface-1 rounded-full flex items-center justify-center shadow-md animate-in zoom-in duration-300">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Selection */}
            <FormField
              label={t('expenses.date')}
              labelClassName="text-[10px] font-black uppercase tracking-[0.2em] text-surface-2/30 mb-3 px-1"
              error={errors.expenseDate && t(errors.expenseDate.message!)}
              errorClassName="mt-2 text-xs font-bold text-danger uppercase tracking-wider px-1"
            >
              <div className="relative group">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-2/20 group-focus-within:text-primary transition-colors" />
                <TextInput 
                  size="lg" 
                  type="date" 
                  variant="soft" 
                  className="rounded-2xl border-border-subtle bg-surface-1/40 h-14 font-bold text-surface-2 pl-12 pr-4 focus:ring-1 focus:ring-primary/20 transition-all"
                  {...register('expenseDate')} 
                />
              </div>
            </FormField>
          </div>
        </main>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-light via-background-light to-transparent pt-12 z-20 pointer-events-none">
        <div className="max-w-md mx-auto w-full flex gap-3 pointer-events-auto">
          <Button 
            className="flex-1 h-14 shadow-glow-primary text-lg rounded-2xl font-black" 
            disabled={!canSubmit || updateExpenseMutation.isPending}
            loading={updateExpenseMutation.isPending} 
            onClick={handleSave} 
            variant="primary"
          >
            {updateExpenseMutation.isPending ? t('common.saving') : t('cta.save')}
          </Button>
          <Button 
            variant="subtle" 
            className="h-14 px-6 justify-center rounded-2xl shrink-0 font-bold" 
            onClick={() => navigate({ 
              to: '/expenses/$expenseId', 
              params: { expenseId },
              search: (prev) => prev
            })}
          >
            {t('cta.cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}
