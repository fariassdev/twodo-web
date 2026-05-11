import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { Banknote, Tag } from 'lucide-react';
import PageHeader from '../../ui/PageHeader';
import ErrorBanner from '../../ui/ErrorBanner';
import FullPageLoading from '../../ui/FullPageLoading';
import { ContextMenu } from '../../ui/ContextMenu/ContextMenu';
import {
  useAuthScope,
  useDeleteExpenseMutation,
  useExpenseByIdQuery,
} from '../../../lib/queryHooks';
import { cn } from '../../../utils';
import { type ExpenseDetailsSearch } from '../../../router';

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

export default function ExpenseDetails() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { expenseId } = useParams({ strict: false }) as { expenseId: string };
  const search = useSearch({ strict: false }) as Partial<ExpenseDetailsSearch>;
  const { profileId } = useAuthScope();

  const expenseQuery = useExpenseByIdQuery(expenseId);
  const deleteExpenseMutation = useDeleteExpenseMutation();

  const [actionError, setActionError] = useState<string | null>(null);

  const expense = expenseQuery.data;

  const categoryLabel = useMemo(() => {
    if (!expense?.category) return '';
    return i18n.language.startsWith('es') ? expense.category.name_es : expense.category.name_en;
  }, [expense, i18n.language]);

  const goBackToExpenses = () => {
    if (search.from === 'dashboard') {
      navigate({ to: '/expenses' });
    } else {
      navigate({
        to: '/expenses/list',
        search: {
          q: search.q,
          categoryId: search.categoryId,
          paidByProfileId: search.paidByProfileId,
          fromDate: search.fromDate,
          toDate: search.toDate,
        },
      });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('expenses.confirmDelete'))) return;

    setActionError(null);
    try {
      await deleteExpenseMutation.mutateAsync(expenseId);
      goBackToExpenses();
    } catch (error) {
      console.error('Delete expense error:', error);
      setActionError(t('queryState.mutationError'));
    }
  };

  if (expenseQuery.isPending) {
    return <FullPageLoading message={t('loading')} />;
  }

  if (expenseQuery.isError || !expense) {
    return (
      <div className="flex flex-col h-dvh bg-background-light dark:bg-background-dark">
        <PageHeader title={t('expenses.expenseDetail')} backAction={{ onClick: goBackToExpenses }} />
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <p className="text-surface-2/40 font-bold uppercase tracking-widest">{t('expenses.notFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-background-light dark:bg-background-dark animate-in fade-in duration-500">
      <PageHeader
        title={t('expenses.expenseDetail')}
        subtitle={t('nav.expenses')}
        backAction={{ onClick: goBackToExpenses }}
        rightSlot={(
          <ContextMenu
            ariaLabel={t('topBar.openMenu')}
            items={[
              { 
                type: 'action', 
                id: 'edit', 
                icon: 'edit', 
                label: t('cta.edit'), 
                onClick: () => navigate({ 
                  to: '/expenses/$expenseId/edit', 
                  params: { expenseId },
                  search: (prev) => prev
                })
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
        <div className="absolute top-[-20px] right-[-40px] opacity-[0.03] pointer-events-none select-none z-0 -rotate-12">
          <span className="material-symbols-outlined text-[320px] font-light">
            {expense.category?.icon || 'payments'}
          </span>
        </div>
        <main className="relative z-10 mx-auto max-w-md">
          {actionError ? <ErrorBanner className="mb-6" message={actionError} /> : null}

          <div className="mt-4 mb-8">
            <div className="flex items-center gap-[0.5rem] leading-none mb-2">
              <span className="font-display text-[clamp(3rem,15vw,5rem)] font-normal tracking-[-0.02em] leading-[0.9] tabular-nums text-surface-2 italic">
                {centsToInput(expense.amount_cents)}
              </span>
              <span className="font-sans text-[clamp(1.2rem,6vw,2.2rem)] font-light text-surface-2/20 pt-[0.4rem]">
                €
              </span>
            </div>

            <p className="text-primary font-bold text-lg">
              {new Date(expense.expense_date + 'T12:00:00').toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>

            <p className="mt-4 text-surface-2/60 leading-relaxed font-medium max-w-[90%]">
              {expense.description || categoryLabel}
            </p>
          </div>

          <div className="animate-in fade-in duration-500">
            <div className="grid grid-cols-2 gap-3 mb-8">
              <SpecItem 
                icon={Tag} 
                label={t('expenses.category')} 
                value={categoryLabel} 
              />
              <SpecItem 
                icon={Banknote} 
                label={t('expenses.splitTitle')} 
                value={t('expenses.splitShared')} 
              />
            </div>

            {/* Paid By Card */}
            <div className="bg-surface-1/40 border border-border-subtle rounded-2xl p-6 mb-10">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-2/40 block mb-1">
                    {t('expenses.paidBy')}
                  </span>
                  <h3 className="text-xl font-black text-surface-2">
                    {expense.paid_by_profile_id === profileId
                      ? t('common.meWithName', { name: expense.paid_by_profile?.name ?? t('common.me') })
                      : expense.paid_by_profile?.name || ''}
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-full border-4 border-surface-1 overflow-hidden bg-primary/10">
                  {expense.paid_by_profile?.avatar_url ? (
                    <img src={expense.paid_by_profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-primary text-xs">
                      {expense.paid_by_profile?.name?.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
