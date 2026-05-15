import { supabase } from '../client';
import { SupabaseError } from '../errors';
import type { Database } from '../../lib/database.types';

export type ExpenseInsert = Database['public']['Tables']['expenses']['Insert'];
export type ExpenseUpdate = Database['public']['Tables']['expenses']['Update'];
export type SettlementInsert = Database['public']['Tables']['settlements']['Insert'];

export async function insertExpense(expense: ExpenseInsert) {
  const { data, error } = await supabase
    .from('expenses')
    .insert(expense)
    .select('*')
    .single();

  if (error) throw new SupabaseError(error);
  return data;
}

export async function updateExpense(id: string, householdId: string, update: ExpenseUpdate) {
  const { data, error } = await supabase
    .from('expenses')
    .update(update)
    .eq('id', id)
    .eq('household_id', householdId)
    .select('*')
    .single();

  if (error) throw new SupabaseError(error);
  return data;
}

export async function deleteExpense(id: string, householdId: string) {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('household_id', householdId);

  if (error) throw new SupabaseError(error);
}

export async function insertSettlement(settlement: SettlementInsert) {
  const { data, error } = await supabase
    .from('settlements')
    .insert(settlement)
    .select('*')
    .single();

  if (error) throw new SupabaseError(error);
  return data;
}
