import { supabase } from '../client';
import { SupabaseError } from '../errors';
import type { Database } from '../../lib/database.types';

export type RawExpense = Database['public']['Tables']['expenses']['Row'] & {
  category: Database['public']['Tables']['expense_categories']['Row'] | null;
  paid_by_profile: Database['public']['Tables']['profiles']['Row'] | null;
  created_by_profile: Database['public']['Tables']['profiles']['Row'] | null;
};

export type RawSettlement = Database['public']['Tables']['settlements']['Row'] & {
  paid_by_profile: Database['public']['Tables']['profiles']['Row'] | null;
  paid_to_profile: Database['public']['Tables']['profiles']['Row'] | null;
  created_by_profile: Database['public']['Tables']['profiles']['Row'] | null;
};

const EXPENSE_SELECT = `
  *,
  category:expense_categories(*),
  paid_by_profile:profiles!expenses_paid_by_profile_id_fkey(*),
  created_by_profile:profiles!expenses_created_by_profile_id_fkey(*)
`;

const SETTLEMENT_SELECT = `
  *,
  paid_by_profile:profiles!settlements_paid_by_profile_id_fkey(*),
  paid_to_profile:profiles!settlements_paid_to_profile_id_fkey(*),
  created_by_profile:profiles!settlements_created_by_profile_id_fkey(*)
`;

export async function fetchExpenseCategories() {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw new SupabaseError(error);
  return data ?? [];
}

export async function fetchExpenses(householdId: string, filters: {
  categoryId?: string;
  paidByProfileId?: string;
  searchText?: string;
  fromDate?: string;
  toDate?: string;
} = {}) {
  const searchText = filters.searchText?.trim();

  if (searchText) {
    const { data, error } = await supabase.rpc('search_expenses', {
      p_household_id: householdId,
      p_search_term: searchText,
      p_category_id: filters.categoryId || undefined,
      p_paid_by_profile_id: filters.paidByProfileId || undefined,
      p_from_date: filters.fromDate || undefined,
      p_to_date: filters.toDate || undefined,
    });

    if (error) throw new SupabaseError(error);
    // Note: RPC doesn't automatically join, so we might need a separate fetch or a better RPC.
    // For now, let's assume we want the full details.
    if (!data || data.length === 0) return [];
    
    const ids = data.map((e: any) => e.id);
    const { data: fullData, error: fullError } = await supabase
      .from('expenses')
      .select(EXPENSE_SELECT)
      .in('id', ids)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (fullError) throw new SupabaseError(fullError);
    return fullData ?? [];
  }

  let query = supabase
    .from('expenses')
    .select(EXPENSE_SELECT)
    .eq('household_id', householdId);

  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.paidByProfileId) query = query.eq('paid_by_profile_id', filters.paidByProfileId);
  if (filters.fromDate) query = query.gte('expense_date', filters.fromDate);
  if (filters.toDate) query = query.lte('expense_date', filters.toDate);

  const { data, error } = await query
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new SupabaseError(error);
  return (data ?? []) as unknown as RawExpense[];
}

export async function fetchExpenseById(id: string, householdId: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select(EXPENSE_SELECT)
    .eq('id', id)
    .eq('household_id', householdId)
    .maybeSingle();

  if (error) throw new SupabaseError(error);
  return data;
}

export async function fetchSettlements(householdId: string) {
  const { data, error } = await supabase
    .from('settlements')
    .select(SETTLEMENT_SELECT)
    .eq('household_id', householdId)
    .order('settled_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new SupabaseError(error);
  return data ?? [];
}

export async function fetchExpenseBalanceSnapshot(householdId: string, profileId: string) {
  const { data: latestSettlement, error: latestSettlementError } = await supabase
    .from('settlements')
    .select('settled_at')
    .eq('household_id', householdId)
    .order('settled_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestSettlementError) throw new SupabaseError(latestSettlementError);

  const lastSettlementAt = latestSettlement?.settled_at ?? null;

  let eventsQuery = supabase
    .from('expense_balance_events')
    .select('from_profile_id, to_profile_id, amount_cents')
    .eq('household_id', householdId);

  if (lastSettlementAt) {
    eventsQuery = eventsQuery.gt('created_at', lastSettlementAt);
  }

  const { data: events, error: eventsError } = await eventsQuery;
  if (eventsError) throw new SupabaseError(eventsError);

  const balanceCents = (events ?? []).reduce((acc, event) => {
    if (event.to_profile_id === profileId) return acc + event.amount_cents;
    if (event.from_profile_id === profileId) return acc - event.amount_cents;
    return acc;
  }, 0);

  return {
    balanceCents,
    lastSettlementAt,
  };
}

export async function fetchExpensesActivityFeedRows(
  householdId: string,
  limit: number,
) {
  const [
    { data: expenseRows, error: expensesError },
    { data: settlementRows, error: settlementsError },
  ] = await Promise.all([
    supabase
      .from('expenses')
      .select(EXPENSE_SELECT)
      .eq('household_id', householdId)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit),

    supabase
      .from('settlements')
      .select(SETTLEMENT_SELECT)
      .eq('household_id', householdId)
      .order('settled_at', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit),
  ]);

  if (expensesError) throw new SupabaseError(expensesError);
  if (settlementsError) throw new SupabaseError(settlementsError);

  return {
    expenseRows: expenseRows ?? [],
    settlementRows: settlementRows ?? [],
  };
}
