import React, { useState, useEffect } from 'react';
import { getShoppingItems, addShoppingItem, togglePurchased, updateQuantity, deleteShoppingItem } from '../lib/queries';
import type { ShoppingItem as ShoppingItemType } from '../lib/types';
import { useTranslation } from 'react-i18next';

export default function ShoppingList() {
  const { t } = useTranslation();
  const [items, setItems] = useState<ShoppingItemType[]>([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    try {
      const data = await getShoppingItems();
      setItems(data);
    } catch (err) {
      console.error('Load shopping items error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newItem.trim();
    if (!name) return;
    try {
      const item = await addShoppingItem(name);
      setItems((prev) => [item, ...prev]);
      setNewItem('');
    } catch (err) {
      console.error('Add item error:', err);
    }
  }

  async function handleToggle(item: ShoppingItemType) {
    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_purchased: !i.is_purchased } : i))
    );
    try {
      await togglePurchased(item.id, item.is_purchased);
    } catch (err) {
      // Revert
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_purchased: item.is_purchased } : i))
      );
      console.error('Toggle error:', err);
    }
  }

  async function handleQuantity(item: ShoppingItemType, delta: number) {
    const newQty = item.quantity + delta;
    if (newQty < 1) return;
    // Optimistic
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i))
    );
    try {
      await updateQuantity(item.id, newQty);
    } catch (err) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, quantity: item.quantity } : i))
      );
      console.error('Quantity error:', err);
    }
  }

  async function handleDelete(id: string) {
    const prev = items;
    setItems((items) => items.filter((i) => i.id !== id));
    try {
      await deleteShoppingItem(id);
    } catch (err) {
      setItems(prev);
      console.error('Delete error:', err);
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

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="p-6 pt-12 max-w-md mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <span className="material-symbols-outlined text-primary">favorite</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">{t('shopping.title')}</h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-6 max-w-md mx-auto w-full">
        <form onSubmit={handleAdd} className="mt-8 mb-10">
          <label className="block text-sm font-medium text-primary mb-3" htmlFor="new-item">{t('shopping.addToList')}</label>
          <div className="relative">
            <input
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
                    className="w-6 h-6 flex items-center justify-center text-primary hover:bg-primary/20 rounded transition-colors"
                    onClick={() => handleQuantity(item, -1)}
                  >
                    <span className="material-symbols-outlined text-sm font-bold">remove</span>
                  </button>
                  <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                  <button
                    className="w-6 h-6 flex items-center justify-center text-primary hover:bg-primary/20 rounded transition-colors"
                    onClick={() => handleQuantity(item, 1)}
                  >
                    <span className="material-symbols-outlined text-sm font-bold">add</span>
                  </button>
                </div>
              </div>
              <button
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
