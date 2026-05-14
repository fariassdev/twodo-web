import { supabase } from '../client';
import { SupabaseError } from '../errors';
import type { Database } from '../../lib/database.types';

export type RawLoveNote = Database['public']['Tables']['love_notes']['Row'] & {
  sender?: Database['public']['Tables']['profiles']['Row'];
};

export async function fetchLatestLoveNote(householdId: string): Promise<RawLoveNote | null> {
  const { data, error } = await supabase
    .from('love_notes')
    .select('*, sender:profiles(*)')
    .eq('household_id', householdId)
    .is('task_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new SupabaseError(error);
  return data as unknown as RawLoveNote | null;
}

export async function fetchLoveNoteForTask(taskId: string, householdId: string): Promise<RawLoveNote | null> {
  const { data, error } = await supabase
    .from('love_notes')
    .select('*, sender:profiles(*)')
    .eq('household_id', householdId)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new SupabaseError(error);
  return data as unknown as RawLoveNote | null;
}
