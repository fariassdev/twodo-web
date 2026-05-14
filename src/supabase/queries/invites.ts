import { supabase } from '../client';
import { SupabaseError } from '../errors';
import type { InviteInfo } from '../../lib/types';

export async function fetchInviteInfo(inviteCode: string): Promise<InviteInfo | null> {
  const { data, error } = await supabase.rpc('get_invite_info', {
    p_invite_code: inviteCode.trim().toUpperCase(),
  });

  if (error) throw new SupabaseError(error);
  return data as InviteInfo | null;
}
