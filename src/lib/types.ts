import type { Session } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Household = Database['public']['Tables']['households']['Row'];

export type HouseholdMember = Database['public']['Tables']['household_members']['Row'] & {
  profile?: Profile;
  household?: Household;
};

export type Task = Database['public']['Tables']['tasks']['Row'] & {
  assigned_profile?: Profile;
  last_done_by_profile?: Profile;
};

export type ShoppingItem = Database['public']['Tables']['shopping_items']['Row'];

export type LoveNote = Database['public']['Tables']['love_notes']['Row'] & {
  sender?: Profile;
};

export type Kudos = Database['public']['Tables']['kudos']['Row'];

export type TaskCompletion = Database['public']['Tables']['task_completions']['Row'];

export type AuthContextStatus = 'signed_out' | 'pending_profile' | 'pending_household' | 'linked';

export interface AuthContext {
  status: AuthContextStatus;
  session: Session | null;
  profile: Profile | null;
  household: Household | null;
  role: string | null;
}

export interface HouseholdInviteResult {
  household_id: string;
  invite_code: string;
  expires_at: string;
}

export interface InviteInfo {
  found: boolean;
  invite_code?: string;
  creator_name?: string;
  creator_avatar?: string | null;
  is_expired?: boolean;
  is_accepted?: boolean;
  member_count?: number;
  expires_at?: string;
}

export interface AcceptInviteResult {
  household_id: string;
}
