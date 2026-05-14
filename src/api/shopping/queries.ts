import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthScope } from '../../context/AuthContext';
import { fetchShoppingItems } from '../../supabase/queries/shopping';
import { shoppingKeys } from './keys';
import { supabase } from '../../lib/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { RawShoppingItem } from '../../supabase/queries/shopping';

function sortShoppingItems(items: RawShoppingItem[]): RawShoppingItem[] {
  return [...items].sort((a, b) => {
    if (a.is_purchased !== b.is_purchased) {
      return Number(a.is_purchased) - Number(b.is_purchased);
    }
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return bTime - aTime;
  });
}

function reconcileShoppingItemsFromRealtime(
  current: RawShoppingItem[] | undefined,
  payload: RealtimePostgresChangesPayload<RawShoppingItem>,
): RawShoppingItem[] {
  const existing = current ?? [];

  if (payload.eventType === 'INSERT') {
    const insertedItem = payload.new as RawShoppingItem;
    if (!insertedItem?.id || existing.some((item) => item.id === insertedItem.id)) {
      return sortShoppingItems(existing);
    }
    return sortShoppingItems([insertedItem, ...existing]);
  }

  if (payload.eventType === 'UPDATE') {
    const updatedItem = payload.new as RawShoppingItem;
    if (!updatedItem?.id) return sortShoppingItems(existing);
    
    const alreadyInCache = existing.some((item) => item.id === updatedItem.id);
    if (!alreadyInCache) return sortShoppingItems([...existing, updatedItem]);

    return sortShoppingItems(
      existing.map((item) => (item.id === updatedItem.id ? { ...item, ...updatedItem } : item)),
    );
  }

  if (payload.eventType === 'DELETE') {
    const deletedId = (payload.old as Partial<RawShoppingItem>)?.id;
    if (!deletedId) return sortShoppingItems(existing);
    return sortShoppingItems(existing.filter((item) => item.id !== deletedId));
  }

  return sortShoppingItems(existing);
}

export const useShoppingItems = () => {
  const queryClient = useQueryClient();
  const { householdId } = useAuthScope();

  useEffect(() => {
    if (!householdId) return;

    let hasReceivedSubscribed = false;

    const shoppingChannel = supabase
      .channel(`shopping-items:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_items',
          filter: `household_id=eq.${householdId}`,
        },
        (payload: RealtimePostgresChangesPayload<RawShoppingItem>) => {
          queryClient.setQueryData<RawShoppingItem[]>(
            shoppingKeys.lists(householdId),
            (current) => reconcileShoppingItemsFromRealtime(current, payload),
          );
        },
      );

    shoppingChannel.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return;
      if (hasReceivedSubscribed) {
        void queryClient.invalidateQueries({ queryKey: shoppingKeys.lists(householdId) });
      }
      hasReceivedSubscribed = true;
    });

    return () => {
      void supabase.removeChannel(shoppingChannel);
    };
  }, [householdId, queryClient]);

  return useQuery({
    queryKey: shoppingKeys.lists(householdId),
    queryFn: () => fetchShoppingItems(householdId),
    enabled: Boolean(householdId),
  });
};
