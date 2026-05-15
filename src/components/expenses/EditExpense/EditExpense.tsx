import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from '@tanstack/react-router';
import PageHeader from '../../ui/PageHeader';
import ErrorBanner from '../../ui/ErrorBanner';
import FullPageLoading from '../../ui/FullPageLoading';
import ExpenseForm from '../ExpenseForm';
import {
  useUpdateExpense,
  useExpense,
} from '../../../api/expenses';
import { type ExpenseFormValues } from '../../../helpers/schemas';
import { parseAmountToCents, centsToInput } from '../../../utils';

export default function EditExpense() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { expenseId } = useParams({ strict: false }) as { expenseId: string };

  const expenseQuery = useExpense(expenseId);
  const updateExpenseMutation = useUpdateExpense();

  const expense = expenseQuery.data;

  const [actionError, setActionError] = useState<string | null>(null);

  const initialValues = useMemo(() => {
    if (!expense) return undefined;
    return {
      amountInput: centsToInput(expense.amount_cents),
      description: expense.description || '',
      categoryId: expense.category_id,
      paidByProfileId: expense.paid_by_profile_id,
      expenseDate: expense.expense_date,
    };
  }, [expense]);

  const handleSave = async (values: ExpenseFormValues) => {
    const parsedAmountCents = parseAmountToCents(values.amountInput);
    if (parsedAmountCents <= 0) return;

    setActionError(null);
    try {
      await updateExpenseMutation.mutateAsync({
        id: expenseId,
        update: {
          amount_cents: parsedAmountCents,
          category_id: values.categoryId,
          paid_by_profile_id: values.paidByProfileId,
          description: values.description,
          expense_date: values.expenseDate,
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
  };

  if (expenseQuery.isPending) {
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

      <div className="flex-1 relative flex flex-col overflow-hidden">
        {actionError ? (
          <div className="px-6 pt-6 mx-auto max-w-md">
            <ErrorBanner className="mb-6" message={actionError} />
          </div>
        ) : null}

        <ExpenseForm
          initialValues={initialValues}
          onSubmit={handleSave}
          isPending={updateExpenseMutation.isPending}
          onCancel={() => navigate({ 
            to: '/expenses/$expenseId', 
            params: { expenseId },
            search: (prev) => prev
          })}
        />
      </div>
    </div>
  );
}
