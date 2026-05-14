import { supabase } from '../../../lib/supabase';

export const TASK_FULL_QUERY = `
  *,
  assigned_profile:profiles!tasks_assigned_to_fkey(*),
  last_done_by_profile:profiles!tasks_last_done_by_fkey(*)
`;

export async function fetchTaskCount(householdId: string) {
  const { count, error } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('household_id', householdId)
    .is('deleted_at', null);

  if (error) throw error;
  return count ?? 0;
}

export async function fetchTasksInRange(params: {
  householdId: string;
  startDate: string;
  endDate: string;
  includeDeleted?: boolean;
}) {
  const { householdId, startDate, endDate, includeDeleted = false } = params;

  let query = supabase
    .from('tasks')
    .select(TASK_FULL_QUERY)
    .eq('household_id', householdId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
    .order('priority', { ascending: true });

  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Return raw data, normalization will happen in hooks
  return data ?? [];
}

export async function fetchTaskCatalog() {
  const { data, error } = await supabase
    .from('task_catalog')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchTaskById(id: string, householdId: string) {
  const { data: task, error } = await supabase
    .from('tasks')
    .select(TASK_FULL_QUERY)
    .eq('household_id', householdId)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;

  return task;
}

export async function fetchTaskCompletions(
  taskId: string,
  householdId: string,
) {
  const { data, error } = await supabase
    .from('task_completions')
    .select('*, profile:profiles(*)')
    .eq('task_id', taskId)
    .eq('household_id', householdId)
    .order('completed_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}
