import React, { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useAuthScope,
  useAddShoppingItemMutation,
  useDeleteShoppingItemMutation,
  useShoppingItemsQuery,
  useTogglePurchasedMutation,
  useUpdateQuantityMutation,
} from '../lib/queryHooks';
import { queryKeys } from '../lib/queryKeys';
import type { ShoppingItem as ShoppingItemType } from '../lib/types';
import { useTranslation } from 'react-i18next';
import TopBar from './ui/TopBar';
import DataStatusBanner from './ui/DataStatusBanner';
import QueryErrorState from './ui/QueryErrorState';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function ShoppingList() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { householdId } = useAuthScope();
  const isOnline = useOnlineStatus();
  const [newItem, setNewItem] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shoppingItemsQuery = useShoppingItemsQuery();
  const addShoppingItemMutation = useAddShoppingItemMutation();
  const togglePurchasedMutation = useTogglePurchasedMutation();
  const updateQuantityMutation = useUpdateQuantityMutation();
  const deleteShoppingItemMutation = useDeleteShoppingItemMutation();

  const items: ShoppingItemType[] = shoppingItemsQuery.data ?? [];
  const loading = shoppingItemsQuery.isPending;
  const isStale = shoppingItemsQuery.isStale;
  const isFetching = shoppingItemsQuery.isFetching;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newItem.trim();
    if (!name) return;
    setActionError(null);
    try {
      await addShoppingItemMutation.mutateAsync(name);
      setNewItem('');
      inputRef.current?.focus();
    } catch (err) {
      console.error('Add item error:', err);
      setActionError(t('queryState.mutationError'));
    }
  }

  async function handleToggle(item: ShoppingItemType) {
    setActionError(null);
    try {
      await togglePurchasedMutation.mutateAsync({
        id: item.id,
        currentValue: item.is_purchased,
      });
    } catch (err) {
      console.error('Toggle error:', err);
      setActionError(t('queryState.mutationError'));
    }
  }

  async function handleQuantity(item: ShoppingItemType, delta: number) {
    const newQty = item.quantity + delta;
    if (newQty < 1) return;
    setActionError(null);
    try {
      await updateQuantityMutation.mutateAsync({ id: item.id, quantity: newQty });
    } catch (err) {
      console.error('Quantity error:', err);
      setActionError(t('queryState.mutationError'));
    }
  }

  async function handleDelete(id: string) {
    setActionError(null);
    try {
      await deleteShoppingItemMutation.mutateAsync(id);
    } catch (err) {
      console.error('Delete error:', err);
      setActionError(t('queryState.mutationError'));
    }
  }

  const toBuy = items.filter((i) => !i.is_purchased);
  const purchased = items.filter((i) => i.is_purchased);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (shoppingItemsQuery.isError && items.length === 0) {
    return (
      <QueryErrorState
        onRetry={() => {
          if (!householdId) return;
          void queryClient.refetchQueries({ queryKey: queryKeys.shopping.list(householdId) });
        }}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <TopBar title={t('shopping.title')} titleIcon="shopping_cart" />

      <main className="flex-1 flex flex-col px-6 max-w-md mx-auto w-full">
        <DataStatusBanner isOffline={!isOnline} isStale={isStale} isFetching={isFetching} />
        {actionError && (
          <p className="mb-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-100">
            {actionError}
          </p>
        )}

        <form onSubmit={handleAdd} className="mt-8 mb-10">
          <label className="block text-sm font-medium text-primary mb-3" htmlFor="new-item">{t('shopping.addToList')}</label>
          <div className="relative">
            <input
              ref={inputRef}
              className="w-full bg-primary/5 border-none rounded-xl h-16 px-6 text-xl placeholder:text-slate-600 focus:ring-2 focus:ring-primary focus:bg-primary/10 transition-all font-display"
              id="new-item"
              placeholder={t('shopping.newItemPlaceholder')}
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              autoFocus
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <button type="submit" className="bg-primary text-background-dark p-3 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined font-bold">add</span>
              </button>
            </div>
          </div>
        </form>

        <div className="space-y-4 mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
            {t('shopping.toBuyWithCount', { count: toBuy.length })}
          </h2>

          {toBuy.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-4">{t('shopping.emptyToBuy')}</p>
          )}

          {toBuy.map((item) => (
            <div key={item.id} className="flex items-center gap-4 bg-slate-800/40 p-4 rounded-xl border border-primary/10 shadow-sm transition-all active:scale-[0.98]">
              <div className="flex-1 flex items-center gap-4">
                <div className="relative flex items-center justify-center">
                  <input
                    className="custom-checkbox h-8 w-8 rounded-lg border-2 border-primary/30 bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 transition-all cursor-pointer appearance-none"
                    type="checkbox"
                    checked={item.is_purchased}
                    onChange={() => handleToggle(item)}
                  />
                </div>
                <span className="text-lg font-medium">{item.name}</span>
                <div className="flex items-center gap-3 bg-primary/10 rounded-lg p-1 px-2 mx-2">
                  <button
                    type="button"
                    className="w-6 h-6 flex items-center justify-center text-primary hover:bg-primary/20 rounded transition-colors"
                    onClick={() => handleQuantity(item, -1)}
                  >
                    <span className="material-symbols-outlined text-sm font-bold">remove</span>
                  </button>
                  <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                  <button
                    type="button"
                    className="w-6 h-6 flex items-center justify-center text-primary hover:bg-primary/20 rounded transition-colors"
                    onClick={() => handleQuantity(item, 1)}
                  >
                    <span className="material-symbols-outlined text-sm font-bold">add</span>
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-red-400 transition-colors"
                onClick={() => handleDelete(item.id)}
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>
          ))}
        </div>

        {purchased.length > 0 && (
          <div className="space-y-4 mb-24">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
              {t('shopping.purchasedWithCount', { count: purchased.length })}
            </h2>
            {purchased.map((item) => (
              <div key={item.id} className="flex items-center gap-4 bg-slate-800/20 p-4 rounded-xl border border-primary/5 shadow-sm opacity-60">
                <div className="flex-1 flex items-center gap-4">
                  <div className="relative flex items-center justify-center">
                    <input
                      className="custom-checkbox h-8 w-8 rounded-lg border-2 border-primary/30 bg-primary text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 transition-all cursor-pointer appearance-none"
                      type="checkbox"
                      checked={true}
                      onChange={() => handleToggle(item)}
                    />
                  </div>
                  <span className="text-lg font-medium line-through text-slate-500">{item.name}</span>
                </div>
                <button
                  type="button"
                  className="text-slate-400 hover:text-red-400 transition-colors"
                  onClick={() => handleDelete(item.id)}
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
