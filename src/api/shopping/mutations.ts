import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthScope } from '../../context/AuthContext';
import { deleteShoppingItem, insertShoppingItem, updateShoppingItem } from '../../supabase/mutations/shopping';
import { shoppingKeys } from './keys';
import type { RawShoppingItem } from '../../supabase/queries/shopping';

export const useAddShoppingItem = () => {
  const queryClient = useQueryClient();
  const { householdId, profileId } = useAuthScope();

  return useMutation({
    mutationFn: (name: string) =>
      insertShoppingItem({
        household_id: householdId,
        added_by: profileId,
        name,
        quantity: 1,
        is_purchased: false,
      }),
    onSuccess: (item) => {
      queryClient.setQueryData<RawShoppingItem[]>(shoppingKeys.lists(householdId), (current) => {
        const existing = current ?? [];
        if (existing.some((i) => i.id === item.id)) return existing;
        return [item, ...existing];
      });
    },
  });
};

export const useToggleShoppingItem = () => {
  const queryClient = useQueryClient();
  const { householdId } = useAuthScope();

  return useMutation({
    mutationFn: ({ id, isPurchased }: { id: string; isPurchased: boolean }) =>
      updateShoppingItem(id, householdId, { is_purchased: !isPurchased }),
    onMutate: async ({ id, isPurchased }) => {
      await queryClient.cancelQueries({ queryKey: shoppingKeys.lists(householdId) });
      const previous = queryClient.getQueryData<RawShoppingItem[]>(shoppingKeys.lists(householdId));

      queryClient.setQueryData<RawShoppingItem[]>(shoppingKeys.lists(householdId), (current) =>
        (current ?? []).map((item) =>
          item.id === id ? { ...item, is_purchased: !isPurchased } : item,
        ),
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(shoppingKeys.lists(householdId), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: shoppingKeys.lists(householdId) });
    },
  });
};

export const useUpdateShoppingItemQuantity = () => {
  const queryClient = useQueryClient();
  const { householdId } = useAuthScope();

  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      updateShoppingItem(id, householdId, { quantity }),
    onMutate: async ({ id, quantity }) => {
      await queryClient.cancelQueries({ queryKey: shoppingKeys.lists(householdId) });
      const previous = queryClient.getQueryData<RawShoppingItem[]>(shoppingKeys.lists(householdId));

      queryClient.setQueryData<RawShoppingItem[]>(shoppingKeys.lists(householdId), (current) =>
        (current ?? []).map((item) => (item.id === id ? { ...item, quantity } : item)),
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(shoppingKeys.lists(householdId), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: shoppingKeys.lists(householdId) });
    },
  });
};

export const useDeleteShoppingItem = () => {
  const queryClient = useQueryClient();
  const { householdId } = useAuthScope();

  return useMutation({
    mutationFn: (id: string) => deleteShoppingItem(id, householdId),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: shoppingKeys.lists(householdId) });
      const previous = queryClient.getQueryData<RawShoppingItem[]>(shoppingKeys.lists(householdId));

      queryClient.setQueryData<RawShoppingItem[]>(shoppingKeys.lists(householdId), (current) =>
        (current ?? []).filter((item) => item.id !== id),
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(shoppingKeys.lists(householdId), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: shoppingKeys.lists(householdId) });
    },
  });
};
