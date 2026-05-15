import { supabase } from '../client';
import { SupabaseError } from '../errors';
import type { Database } from '../../lib/database.types';

export type RawShoppingItem = Database['public']['Tables']['shopping_items']['Row'];

export async function fetchShoppingItems(householdId: string): Promise<RawShoppingItem[]> {
  const { data, error } = await supabase
    .from('shopping_items')
    .select('*')
    .eq('household_id', householdId)
    .order('is_purchased', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw new SupabaseError(error);
  return data ?? [];
}
