import { supabase } from '../client';
import { SupabaseError } from '../errors';
import type { Database } from '../../lib/database.types';

export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export async function updateProfile(id: string, input: ProfileUpdate) {
  const { data, error } = await supabase
    .from('profiles')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new SupabaseError(error);
  return data;
}
