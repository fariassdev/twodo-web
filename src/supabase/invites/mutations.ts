import { supabase } from '../client';
import { SupabaseError } from '../errors';
import type { AcceptInviteResult, HouseholdInviteResult } from '../../lib/types';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createHouseholdAndInvite(): Promise<HouseholdInviteResult> {
  const { data, error } = await supabase.rpc('create_household_and_invite');
  if (error) throw new SupabaseError(error);
  return data as unknown as HouseholdInviteResult;
}

export async function getOrCreateHouseholdInvite({
  householdId,
  profileId,
}: {
  householdId: string;
  profileId: string;
}): Promise<HouseholdInviteResult> {
  const nowIso = new Date().toISOString();
  const { data: existingRows, error: existingError } = await supabase
    .from('household_invites')
    .select('household_id, invite_code, expires_at')
    .eq('household_id', householdId)
    .eq('created_by', profileId)
    .is('accepted_by', null)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(1);

  if (existingError) throw new SupabaseError(existingError);
  if (existingRows?.[0]) return existingRows[0];

  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = generateInviteCode();
    const { data, error } = await supabase
      .from('household_invites')
      .insert({
        household_id: householdId,
        created_by: profileId,
        invite_code: inviteCode,
        expires_at: expiresAt,
      })
      .select('household_id, invite_code, expires_at')
      .single();

    if (!error && data) return data;
    if (!error || error.code !== '23505') throw new SupabaseError(error);
  }
  throw new Error('Could not generate a unique invite code');
}

export async function acceptHouseholdInvite(inviteCode: string): Promise<AcceptInviteResult> {
  const { data, error } = await supabase.rpc('accept_household_invite', {
    p_invite_code: inviteCode.trim().toUpperCase(),
  });
  if (error) throw new SupabaseError(error);
  return data as unknown as AcceptInviteResult;
}

export async function sendEmailInvite(params: {
  inviteCode: string;
  email: string;
  senderName: string;
}): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await supabase.functions.invoke('send-invite-email', {
    body: {
      invite_code: params.inviteCode,
      email: params.email,
      sender_name: params.senderName,
    },
  });

  if (response.error) throw response.error;
}
