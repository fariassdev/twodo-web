import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthScope } from '../../context/AuthContext';
import { deleteExpense, insertExpense, insertSettlement, updateExpense } from '../../supabase/mutations/expenses';
import { expenseKeys } from './keys';
import { fetchExpenseBalanceSnapshot } from '../../supabase/queries/expenses';
import { fetchProfiles } from '../../supabase/queries/profiles';
import { CreateExpenseInput, UpdateExpenseInput } from '../../domain/expense';

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  const { householdId, profileId } = useAuthScope();

  return useMutation({
    mutationFn: (input: CreateExpenseInput) =>
      insertExpense({
        ...input,
        household_id: householdId,
        created_by_profile_id: profileId,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.lists(householdId) });
      void queryClient.invalidateQueries({ queryKey: expenseKeys.feed(householdId) });
      void queryClient.invalidateQueries({ queryKey: expenseKeys.balance(householdId, profileId) });
    },
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();
  const { householdId, profileId } = useAuthScope();

  return useMutation({
    mutationFn: ({ id, update }: { id: string; update: UpdateExpenseInput }) =>
      updateExpense(id, householdId, update),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.detail(householdId, data.id) });
      void queryClient.invalidateQueries({ queryKey: expenseKeys.lists(householdId) });
      void queryClient.invalidateQueries({ queryKey: expenseKeys.feed(householdId) });
      void queryClient.invalidateQueries({ queryKey: expenseKeys.balance(householdId, profileId) });
    },
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  const { householdId, profileId } = useAuthScope();

  return useMutation({
    mutationFn: (id: string) => deleteExpense(id, householdId),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.detail(householdId, id) });
      void queryClient.invalidateQueries({ queryKey: expenseKeys.lists(householdId) });
      void queryClient.invalidateQueries({ queryKey: expenseKeys.feed(householdId) });
      void queryClient.invalidateQueries({ queryKey: expenseKeys.balance(householdId, profileId) });
    },
  });
};

export const useCreateSettlement = () => {
  const queryClient = useQueryClient();
  const { householdId, profileId } = useAuthScope();

  return useMutation({
    mutationFn: async (input: { note?: string }) => {
      const balance = await fetchExpenseBalanceSnapshot(householdId, profileId);
      if (balance.balanceCents === 0) throw new Error('Balance is zero');

      const profiles = await fetchProfiles(householdId);
      const counterparty = profiles.find((p) => p.id !== profileId);
      if (!counterparty) throw new Error('No counterparty found');

      const payerId = balance.balanceCents < 0 ? profileId : counterparty.id;
      const receiverId = balance.balanceCents < 0 ? counterparty.id : profileId;

      return insertSettlement({
        household_id: householdId,
        paid_by_profile_id: payerId,
        paid_to_profile_id: receiverId,
        created_by_profile_id: profileId,
        amount_cents: Math.abs(balance.balanceCents),
        note: input.note?.trim() || null,
        settled_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.settlements(householdId) });
      void queryClient.invalidateQueries({ queryKey: expenseKeys.lists(householdId) });
      void queryClient.invalidateQueries({ queryKey: expenseKeys.feed(householdId) });
      void queryClient.invalidateQueries({ queryKey: expenseKeys.balance(householdId, profileId) });
    },
  });
};
