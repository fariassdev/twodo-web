import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import PageHeader from '../../ui/PageHeader';
import ErrorBanner from '../../ui/ErrorBanner';
import ExpenseForm from '../ExpenseForm';
import {
  useCreateExpense,
} from '../../../api/expenses';
import { type ExpenseFormValues } from '../../../helpers/schemas';
import { parseAmountToCents } from '../../../utils';

export default function CreateExpense() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createExpenseMutation = useCreateExpense();

  const [actionError, setActionError] = useState<string | null>(null);

  const handleSave = async (values: ExpenseFormValues) => {
    const parsedAmountCents = parseAmountToCents(values.amountInput);
    if (parsedAmountCents <= 0) return;

    setActionError(null);
    try {
      const created = await createExpenseMutation.mutateAsync({
        amount_cents: parsedAmountCents,
        category_id: values.categoryId,
        paid_by_profile_id: values.paidByProfileId,
        description: values.description,
        expense_date: values.expenseDate,
      });

      navigate({ to: '/expenses/$expenseId', params: { expenseId: created.id } });
    } catch (error) {
      console.error('Create expense error:', error);
      setActionError(t('queryState.mutationError'));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background-light dark:bg-background-dark animate-in fade-in slide-in-from-right duration-300">
      <PageHeader
        title={t('expenses.newExpense')}
        subtitle={t('nav.expenses')}
        showAvatars={false}
        backAction={{
          onClick: () => navigate({ to: '/expenses' }),
        }}
      />

      <div className="flex-1 relative flex flex-col overflow-hidden">
        {actionError ? (
          <div className="px-6 pt-6 mx-auto max-w-md">
            <ErrorBanner className="mb-6" message={actionError} />
          </div>
        ) : null}

        <ExpenseForm
          onSubmit={handleSave}
          isPending={createExpenseMutation.isPending}
          onCancel={() => navigate({ to: '/expenses' })}
        />
      </div>
    </div>
  );
}
