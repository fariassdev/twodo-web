import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { Check, Trash2, Calendar, Tag, CreditCard, Users, Edit3, Banknote } from 'lucide-react';
import PageHeader from '../../ui/PageHeader';
import Button from '../../ui/Button';
import ErrorBanner from '../../ui/ErrorBanner';
import FormField from '../../ui/FormField';
import QueryErrorState from '../../ui/QueryErrorState';
import { NumericInput } from '../../ui/NumericInput';
import TextInput from '../../ui/TextInput';
import FullPageLoading from '../../ui/FullPageLoading';
import ScrollContainer from '../../ui/ScrollContainer/ScrollContainer';
import { ContextMenu } from '../../ui/ContextMenu/ContextMenu';
import {
  useAuthScope,
  useDeleteExpenseMutation,
  useExpenseByIdQuery,
  useExpenseCategoriesQuery,
  useProfilesQuery,
  useUpdateExpenseMutation,
} from '../../../lib/queryHooks';
import { expenseFormSchema, type ExpenseFormValues } from '../../../helpers/schemas';
import { cn } from '../../../utils';
import type { ExpenseDetailsSearch, ExpensesListSearch } from '../../../router';

function SpecItem({ icon: Icon, label, value, colorClass = "text-primary" }: { icon: any, label: string, value: string, colorClass?: string }) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-2xl bg-surface-1/50 border border-border-subtle">
      <div className="flex items-center gap-1.5 opacity-40">
        <Icon size={14} className={colorClass} />
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-sm font-bold text-surface-2 truncate">{value}</span>
    </div>
  );
}

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
    if (typeof detailSearch.q === 'string' && detailSearch.q.trim().length > 0) search.q = detailSearch.q.trim();
    if (typeof detailSearch.categoryId === 'string' && detailSearch.categoryId.trim().length > 0) search.categoryId = detailSearch.categoryId.trim();
    if (typeof detailSearch.paidByProfileId === 'string' && detailSearch.paidByProfileId.trim().length > 0) search.paidByProfileId = detailSearch.paidByProfileId.trim();
    if (typeof detailSearch.fromDate === 'string' && detailSearch.fromDate.trim().length > 0) search.fromDate = detailSearch.fromDate.trim();
    if (typeof detailSearch.toDate === 'string' && detailSearch.toDate.trim().length > 0) search.toDate = detailSearch.toDate.trim();
    return search;
  }, [detailSearch]);

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
  const categories = categoriesQuery.data ?? [];
  const profiles = profilesQuery.data ?? [];

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
  const selectedCategoryId = watch('categoryId');
  const paidByProfileId = watch('paidByProfileId');
  const amountCents = useMemo(() => inputToCents(amountInput), [amountInput]);

  const orderedProfiles = useMemo(() => {
    if (!profileId || profiles.length <= 1) return profiles;
    const meIndex = profiles.findIndex((p) => p.id === profileId);
    if (meIndex === -1) return profiles;
    const sorted = [...profiles];
    const [me] = sorted.splice(meIndex, 1);
    return [me, ...sorted];
  }, [profiles, profileId]);

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

  if (expenseQuery.isPending) return <FullPageLoading message={t('loading')} />;
  if (expenseQuery.isError) return <QueryErrorState onRetry={() => expenseQuery.refetch()} onBack={goBackToExpenses} />;
  if (!expense) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-surface-2/60">{t('expenses.notFound')}</p>
        <Button onClick={goBackToExpenses} size="sm" variant="ghost">{t('cta.back')}</Button>
      </div>
    );
  }

  const categoryLabel = i18n.language.startsWith('es')
    ? expense.category?.name_es ?? t('expenses.categoryFallback')
    : expense.category?.name_en ?? t('expenses.categoryFallback');

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background-light dark:bg-background-dark animate-in fade-in slide-in-from-right duration-300">
      <PageHeader
        title={t('expenses.expenseDetail')}
        subtitle={t('nav.expenses')}
        backAction={{ onClick: goBackToExpenses }}
        rightSlot={!isEditing && (
          <ContextMenu
            ariaLabel={t('topBar.openMenu')}
            items={[
              { 
                type: 'action', 
                id: 'edit', 
                icon: 'edit', 
                label: t('cta.edit'), 
                onClick: () => {
                  setActionError(null);
                  loadForm();
                  setIsEditing(true);
                } 
              },
              { type: 'divider', id: 'div1' },
              { 
                type: 'action',
                id: 'delete', 
                icon: 'delete_outline', 
                label: t('cta.delete'), 
                danger: true, 
                onClick: handleDelete,
              },
            ]}
          />
        )}
      />

      <div className="relative flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-6 pb-12 pt-6">
        {!isEditing && (
          <div className="absolute top-[-20px] right-[-40px] opacity-[0.03] pointer-events-none select-none z-0 -rotate-12">
            <span className="material-symbols-outlined text-[320px] font-light">
              {expense.category?.icon || 'payments'}
            </span>
          </div>
        )}
        <main className="relative z-10 mx-auto max-w-md">
          {actionError ? <ErrorBanner className="mb-6" message={actionError} /> : null}

          {/* Hero Section (View/Edit) */}
          <FormField
            label={t('expenses.amount')}
            labelClassName="text-[10px] font-black uppercase tracking-[0.2em] text-surface-2/30 mb-2 block text-center"
            className="relative mb-2 pt-2"
            error={isEditing && errors.amountInput && t(errors.amountInput.message!)}
            errorClassName="mt-6 text-xs font-bold text-danger uppercase tracking-wider text-center"
          >
            <div className="relative">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-primary/5 blur-3xl z-0" />
              
              <div className="relative z-10 flex flex-col items-center justify-center">
                <div className="flex items-start leading-none gap-[0.5rem]">
                  {isEditing ? (
                    <Controller
                      name="amountInput"
                      control={control}
                      render={({ field }) => (
                        <NumericInput
                          {...field}
                          autoFocus
                          className="w-full min-w-[120px] max-w-[280px] bg-transparent text-center font-display text-[clamp(3rem,15vw,5rem)] font-normal tracking-[-0.02em] leading-[0.9] tabular-nums text-surface-2 focus:outline-none italic"
                          placeholder="0.00"
                        />
                      )}
                    />
                  ) : (
                    <span className="font-display text-[clamp(3rem,15vw,5rem)] font-normal tracking-[-0.02em] leading-[0.9] tabular-nums text-surface-2 italic">
                      {centsToInput(expense.amount_cents)}
                    </span>
                  )}
                  <span className="font-sans text-[clamp(1.2rem,6vw,2.2rem)] font-light text-surface-2/20 pt-[0.4rem]">
                    €
                  </span>
                </div>
              </div>
            </div>
          </FormField>

          <FormField
            className="mt-0 mb-10 relative w-full text-center px-4"
            error={isEditing && errors.description && t(errors.description.message!)}
            errorClassName="mt-2 text-[10px] font-bold text-danger uppercase tracking-wider text-center animate-in fade-in slide-in-from-top-1 duration-300"
          >
            {isEditing ? (
              <TextInput
                {...register('description')}
                placeholder={t('expenses.descriptionPlaceholder')}
                type="text"
                variant="editorial"
              />
            ) : (
              <span className="text-primary text-sm font-medium italic">
                {expense.description || categoryLabel}
              </span>
            )}
          </FormField>

          {isEditing ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <FormField
                label={t('expenses.category')}
                labelClassName="text-[10px] font-black uppercase tracking-[0.2em] text-surface-2/30 mb-4 px-2"
                error={errors.categoryId && t(errors.categoryId.message!)}
                errorClassName="mt-2 text-xs font-bold text-danger uppercase tracking-wider px-2"
              >
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
                          <span className={cn("material-symbols-outlined text-xl transition-transform duration-300", active && "scale-110 filled-icon")}>
                            {category.icon}
                          </span>
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </ScrollContainer>
              </FormField>

              <FormField
                label={t('expenses.paidBy')}
                labelClassName="text-[10px] font-black uppercase tracking-[0.2em] text-surface-2/30 mb-6 text-center"
                error={errors.paidByProfileId && t(errors.paidByProfileId.message!)}
                errorClassName="mt-4 text-xs font-bold text-danger uppercase tracking-wider text-center"
              >
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
                          active ? "bg-primary/10 ring-2 ring-primary shadow-glow-primary/20" : "bg-surface-1/40 border border-border-subtle hover:bg-surface-1 hover:border-primary/30"
                        )}
                      >
                        <div className={cn("w-16 h-16 rounded-2xl overflow-hidden transition-all duration-300 mb-3 border-2", active ? "border-primary shadow-glow-primary scale-110" : "border-surface-2/10 group-hover:border-primary/30")}>
                          {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt={profile.name || ''} className="w-full h-full object-cover" />
                          ) : (
                            <div className={cn("w-full h-full flex items-center justify-center text-xl font-bold", active ? "bg-primary text-surface-1" : "bg-surface-2/5 text-surface-2/40")}>
                              {profile.name?.[0]?.toUpperCase() || '?'}
                            </div>
                          )}
                        </div>
                        <span className={cn("text-sm font-bold tracking-tight", active ? "text-primary" : "text-surface-2/60")}>
                          {profile.id === profileId ? t('common.me') : profile.name}
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
              </FormField>

              <FormField
                label={t('expenses.date')}
                labelClassName="text-[10px] font-black uppercase tracking-[0.2em] text-surface-2/30 mb-4 px-2"
                error={errors.expenseDate && t(errors.expenseDate.message!)}
                errorClassName="mt-2 text-xs font-bold text-danger uppercase tracking-wider px-2"
              >
                <TextInput size="lg" type="date" variant="soft" className="rounded-2xl border-border-subtle bg-surface-1/50" {...register('expenseDate')} />
              </FormField>
            </div>
          ) : (
            <div className="animate-in fade-in duration-500">
              <div className="grid grid-cols-2 gap-3">
                <SpecItem 
                  icon={Users} 
                  label={t('expenses.paidBy')} 
                  value={expense.paid_by_profile_id === profileId
                    ? t('common.meWithName', { name: expense.paid_by_profile?.name ?? t('common.me') })
                    : expense.paid_by_profile?.name || ''} 
                />
                <SpecItem 
                  icon={Tag} 
                  label={t('expenses.category')} 
                  value={categoryLabel} 
                />
                <SpecItem 
                  icon={Calendar} 
                  label={t('expenses.date')} 
                  value={new Date(`${expense.expense_date}T12:00:00`).toLocaleDateString(i18n.language, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })} 
                />
                <SpecItem 
                  icon={Banknote} 
                  label={t('expenses.splitTitle')} 
                  value={t('expenses.splitShared')} 
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {isEditing && (
        <div className="shrink-0 p-4 pb-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-xl border-t border-border-subtle shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
          <div className="max-w-md mx-auto w-full">
            <div className="grid grid-cols-2 gap-4">
              <Button
                className="h-16 rounded-2xl font-bold border-border-subtle"
                onClick={() => setIsEditing(false)}
                variant="subtle"
              >
                {t('cta.cancel')}
              </Button>
              <Button
                className="h-16 shadow-glow-primary rounded-2xl font-bold"
                disabled={amountCents <= 0 || updateExpenseMutation.isPending}
                loading={updateExpenseMutation.isPending}
                onClick={handleSave}
                variant="primary"
              >
                {updateExpenseMutation.isPending ? t('common.saving') : t('cta.save')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
