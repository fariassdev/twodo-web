import { supabase } from '../client';
import { SupabaseError } from '../errors';
import type { Database } from '../../lib/database.types';

export type ShoppingItemInsert = Database['public']['Tables']['shopping_items']['Insert'];
export type ShoppingItemUpdate = Database['public']['Tables']['shopping_items']['Update'];

export async function insertShoppingItem(item: ShoppingItemInsert) {
  const { data, error } = await supabase
    .from('shopping_items')
    .insert(item)
    .select()
    .single();

  if (error) throw new SupabaseError(error);
  return data;
}

export async function updateShoppingItem(id: string, householdId: string, update: ShoppingItemUpdate) {
  const { data, error } = await supabase
    .from('shopping_items')
    .update(update)
    .eq('id', id)
    .eq('household_id', householdId)
    .select()
    .single();

  if (error) throw new SupabaseError(error);
  return data;
}

export async function deleteShoppingItem(id: string, householdId: string) {
  const { error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('id', id)
    .eq('household_id', householdId);

  if (error) throw new SupabaseError(error);
}
