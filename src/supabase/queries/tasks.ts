import { supabase } from '../client';
import { SupabaseError } from '../errors';
import type { Database } from '../../lib/database.types';

// ── Raw types ──────────────────────────────────────────────────────────────────
// Only used within src/supabase/ and src/domain/. Components never see these.

export type RawProfile = Database['public']['Tables']['profiles']['Row'];
export type RawTask = Database['public']['Tables']['tasks']['Row'] & {
  assigned_profile: RawProfile | null;
  last_done_by_profile: RawProfile | null;
};

// ── Query fragment ─────────────────────────────────────────────────────────────

const TASK_SELECT = `
  *,
  assigned_profile:profiles!tasks_assigned_to_fkey(*),
  last_done_by_profile:profiles!tasks_last_done_by_fkey(*)
`;

// ── Fetch functions ────────────────────────────────────────────────────────────

export async function fetchTasksInRange(
  householdId: string,
  startDate: string,
  endDate: string,
  includeDeleted = false,
): Promise<RawTask[]> {
  let query = supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('household_id', householdId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
    .order('priority', { ascending: true });

  if (!includeDeleted) query = query.is('deleted_at', null);

  const { data, error } = await query;
  if (error) throw new SupabaseError(error);
  return (data ?? []) as unknown as RawTask[];
}

export async function fetchTaskById(
  householdId: string,
  taskId: string,
): Promise<RawTask | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('household_id', householdId)
    .eq('id', taskId)
    .maybeSingle();

  if (error) throw new SupabaseError(error);
  return data as unknown as RawTask | null;
}

export async function fetchTaskCount(householdId: string): Promise<number> {
  const { count, error } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('household_id', householdId)
    .is('deleted_at', null);

  if (error) throw new SupabaseError(error);
  return count ?? 0;
}

export async function fetchTaskCompletions(householdId: string, taskId: string) {
  const { data, error } = await supabase
    .from('task_completions')
    .select('*, profile:profiles(*)')
    .eq('task_id', taskId)
    .eq('household_id', householdId)
    .order('completed_at', { ascending: true });

  if (error) throw new SupabaseError(error);
  return data ?? [];
}

export async function fetchTaskCatalog() {
  const { data, error } = await supabase
    .from('task_catalog')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw new SupabaseError(error);
  return data ?? [];
}
