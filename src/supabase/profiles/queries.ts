import { supabase } from '../client';
import { SupabaseError } from '../errors';
import type { Database } from '../../lib/database.types';

export type RawProfile = Database['public']['Tables']['profiles']['Row'];

export async function fetchProfiles(householdId: string): Promise<RawProfile[]> {
  const { data: memberships, error: membershipsError } = await supabase
    .from('household_members')
    .select('profile_id')
    .eq('household_id', householdId);

  if (membershipsError) throw new SupabaseError(membershipsError);

  const profileIds = (memberships ?? []).map((membership) => membership.profile_id);
  if (profileIds.length === 0) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('id', profileIds)
    .order('name');

  if (error) throw new SupabaseError(error);
  return data ?? [];
}

export async function fetchProfileById(id: string, householdId: string): Promise<RawProfile | null> {
  const { data: membership, error: membershipError } = await supabase
    .from('household_members')
    .select('profile_id')
    .eq('household_id', householdId)
    .eq('profile_id', id)
    .maybeSingle();

  if (membershipError) throw new SupabaseError(membershipError);
  if (!membership) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new SupabaseError(error);
  return data;
}
