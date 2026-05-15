import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, onAuthStateChange } from '../../lib/supabase';
import type { AuthContext, Profile, Household } from '../../lib/types';

// ── Low Level Supabase Actions ────────────────────────────────────────────────

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPasswordForEmail(email: string, redirectTo: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function resendConfirmationEmail(email: string) {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) throw error;
}

// ── Auth Context Fetching Logic ───────────────────────────────────────────────

async function getProfileByAuthUserId(authUserId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) return null;
  return data;
}

async function getMembership(profileId: string): Promise<{ householdId: string; role: string } | null> {
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error || !data) return null;
  return { householdId: data.household_id, role: data.role };
}

async function getHouseholdById(householdId: string): Promise<Household | null> {
  const { data, error } = await supabase
    .from('households')
    .select('*')
    .eq('id', householdId)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function getAuthContext(): Promise<AuthContext> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.user) {
    return { status: 'signed_out', session: null, profile: null, household: null, role: null };
  }

  // Ensure profile is linked (RPC call)
  await supabase.rpc('link_profile_to_auth_user');

  const profile = await getProfileByAuthUserId(session.user.id);
  if (!profile) return { status: 'pending_profile', session, profile: null, household: null, role: null };

  const membership = await getMembership(profile.id);
  if (!membership) return { status: 'pending_household', session, profile, household: null, role: null };

  const household = await getHouseholdById(membership.householdId);
  if (!household) return { status: 'pending_household', session, profile, household: null, role: membership.role };

  return {
    status: 'linked',
    session,
    profile,
    household,
    role: membership.role,
  };
}

// ── TanStack Query Infrastructure ─────────────────────────────────────────────

export const authQueryKeys = {
  context: () => ['auth', 'context'] as const,
};

export function useAuthInfrastructureQuery() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange(() => {
      void queryClient.invalidateQueries({ queryKey: authQueryKeys.context() });
    });
    return () => { subscription.unsubscribe(); };
  }, [queryClient]);

  return useQuery<AuthContext>({
    queryKey: authQueryKeys.context(),
    queryFn: getAuthContext,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
  });
}
