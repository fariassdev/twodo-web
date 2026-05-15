import React, { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import {
  useAddShoppingItem,
  useDeleteShoppingItem,
  useShoppingItems,
  useUpdateShoppingItemQuantity,
  shoppingKeys,
  useToggleShoppingItem,
} from '../../api/shopping';
import type { ShoppingItem as ShoppingItemType } from '../../lib/types';
import { useTranslation } from 'react-i18next';
import PageHeader from '../ui/PageHeader';
import DataStatusBanner from '../ui/DataStatusBanner';
import QueryErrorState from '../ui/QueryErrorState';
import Button from '../ui/Button';
import FullPageLoading from '../ui/FullPageLoading';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { shoppingItemSchema, type ShoppingItemFormValues } from '../../domain/schemas';
import { useAuthScope } from '@/src/context/AuthContext';

export default function ShoppingList() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { householdId } = useAuthScope();
  const isOnline = useOnlineStatus();
  const [actionError, setActionError] = React.useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shoppingItemsQuery = useShoppingItems();
  const addShoppingItemMutation = useAddShoppingItem();
  const toggleShoppingItemMutation = useToggleShoppingItem();
  const updateShoppingItemQuantityMutation = useUpdateShoppingItemQuantity();
  const deleteShoppingItemMutation = useDeleteShoppingItem();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ShoppingItemFormValues>({
    resolver: zodResolver(shoppingItemSchema),
  });

  const { ref: registerRef, ...registerRest } = register('name');

  const items: ShoppingItemType[] = shoppingItemsQuery.data ?? [];
  const loading = shoppingItemsQuery.isPending;
  const isStale = shoppingItemsQuery.isStale;
  const isFetching = shoppingItemsQuery.isFetching;

  async function onAddItem(data: ShoppingItemFormValues) {
    setActionError(null);
    try {
      await addShoppingItemMutation.mutateAsync(data.name.trim());
      reset();
      inputRef.current?.focus();
    } catch (err) {
      console.error('Add item error:', err);
      setActionError(t('queryState.mutationError'));
    }
  }

  async function handleToggle(item: ShoppingItemType) {
    setActionError(null);
    try {
      await toggleShoppingItemMutation.mutateAsync({
        id: item.id,
        isPurchased: item.is_purchased,
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
      await updateShoppingItemQuantityMutation.mutateAsync({ id: item.id, quantity: newQty });
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
    return <FullPageLoading message={t('loading')} />;
  }


  if (shoppingItemsQuery.isError && items.length === 0) {
    return (
      <QueryErrorState
        onRetry={() => {
          if (!householdId) return;
          void queryClient.refetchQueries({ queryKey: shoppingKeys.all(householdId!) });
        }}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background-dark">
      <PageHeader title={t('shopping.title')} subtitle={t('nav.shopping')} />

      <main className="px-6 max-w-md mx-auto w-full pb-20">
        <DataStatusBanner isOffline={!isOnline} isStale={isStale} isFetching={isFetching} />
        {actionError && (
          <p className="mb-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
            {actionError}
          </p>
        )}

        <form onSubmit={handleSubmit(onAddItem)} className="mt-8 mb-10">
          <label className="block text-sm font-medium text-primary mb-3" htmlFor="new-item">{t('shopping.addToList')}</label>
          <div className="relative">
            <input
              ref={(el) => {
                registerRef(el);
                (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
              }}
              className="w-full bg-primary/5 border border-primary/20 rounded-xl h-16 px-6 text-xl placeholder:text-surface-2/30 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-primary/10 transition-all font-display text-surface-2"
              id="new-item"
              placeholder={t('shopping.newItemPlaceholder')}
              type="text"
              autoFocus
              {...registerRest}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Button 
                type="submit" 
                variant="action"
                size="icon"
                className="h-12 w-12 rounded-lg hover:scale-none shadow-none"
              >
                <Plus />
              </Button>
            </div>
          </div>
        </form>

        <div className="space-y-4 mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-surface-2/60 mb-2">
            {t('shopping.toBuyWithCount', { count: toBuy.length })}
          </h2>

          {toBuy.length === 0 && (
            <p className="text-surface-2/40 text-sm text-center py-4">{t('shopping.emptyToBuy')}</p>
          )}

          {toBuy.map((item) => (
            <div key={item.id} className="flex items-center gap-3 sm:gap-4 bg-surface-1 p-3 sm:p-4 rounded-2xl border border-primary/10 shadow-sm transition-all active:scale-[0.98]">
              <div className="flex-shrink-0 flex items-center justify-center">
                <input
                  className="custom-checkbox h-8 w-8 rounded-lg border-2 border-primary/30 bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 transition-all cursor-pointer appearance-none"
                  type="checkbox"
                  checked={item.is_purchased}
                  onChange={() => handleToggle(item)}
                />
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-base font-bold text-surface-2 block break-words leading-tight">
                  {item.name}
                </span>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <div className="flex items-center gap-1 sm:gap-2 bg-primary/10 rounded-lg p-1 sm:px-2">
                  <button
                    type="button"
                    className="w-7 h-7 flex items-center justify-center text-primary hover:bg-primary/20 rounded transition-colors"
                    onClick={() => handleQuantity(item, -1)}
                  >
                    <span className="material-symbols-outlined text-sm font-bold">remove</span>
                  </button>
                  <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                  <button
                    type="button"
                    className="w-7 h-7 flex items-center justify-center text-primary hover:bg-primary/20 rounded transition-colors"
                    onClick={() => handleQuantity(item, 1)}
                  >
                    <span className="material-symbols-outlined text-sm font-bold">add</span>
                  </button>
                </div>
                
                <button
                  type="button"
                  className="text-surface-2/40 hover:text-danger transition-colors p-1.5 sm:p-2"
                  onClick={() => handleDelete(item.id)}
                >
                  <span className="material-symbols-outlined text-xl">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {purchased.length > 0 && (
          <div className="space-y-4 mb-24">
            <h2 className="text-xs font-bold uppercase tracking-widest text-surface-2/60 mb-2">
              {t('shopping.purchasedWithCount', { count: purchased.length })}
            </h2>
            {purchased.map((item) => (
              <div key={item.id} className="flex items-center gap-3 sm:gap-4 bg-surface-1/50 p-3 sm:p-4 rounded-xl border border-border-subtle shadow-sm opacity-60">
                <div className="flex-shrink-0 flex items-center justify-center">
                  <input
                    className="custom-checkbox h-8 w-8 rounded-lg border-2 border-primary/30 bg-primary text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 transition-all cursor-pointer appearance-none"
                    type="checkbox"
                    checked={true}
                    onChange={() => handleToggle(item)}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-base font-medium line-through text-surface-2/40 block break-words leading-tight">
                    {item.name}
                  </span>
                </div>
                <button
                  type="button"
                  className="text-surface-2/40 hover:text-danger transition-colors p-1.5 sm:p-2 flex-shrink-0"
                  onClick={() => handleDelete(item.id)}
                >
                  <span className="material-symbols-outlined text-xl">delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
