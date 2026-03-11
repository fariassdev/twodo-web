import { supabase } from './supabase';
import type {
  AcceptInviteResult,
  AuthContext,
  Household,
  HouseholdInviteResult,
  InviteInfo,
  LoveNote,
  Profile,
  ShoppingItem,
  Task,
} from './types';

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return (error as { code?: string }).code === 'PGRST116';
}

async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

async function linkProfileToAuthUser() {
  const { error } = await supabase.rpc('link_profile_to_auth_user');
  if (error) {
    throw error;
  }
}

async function getProfileByAuthUserId(authUserId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }

  return data;
}

async function getMembership(profileId: string): Promise<{ householdId: string; role: string } | null> {
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }

  if (!data) return null;

  return {
    householdId: data.household_id,
    role: data.role,
  };
}

async function getHouseholdById(householdId: string): Promise<Household | null> {
  const { data, error } = await supabase
    .from('households')
    .select('*')
    .eq('id', householdId)
    .maybeSingle();

  if (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }

  return data;
}

async function getHouseholdMemberCount(householdId: string): Promise<number> {
  const { count, error } = await supabase
    .from('household_members')
    .select('*', { count: 'exact', head: true })
    .eq('household_id', householdId);

  if (error) throw error;
  return count ?? 0;
}

export async function getAuthContext(): Promise<AuthContext> {
  const session = await getSession();

  if (!session?.user) {
    return {
      status: 'signed_out',
      session: null,
      profile: null,
      household: null,
      role: null,
    };
  }

  await linkProfileToAuthUser();

  const profile = await getProfileByAuthUserId(session.user.id);
  if (!profile) {
    return {
      status: 'pending_profile',
      session,
      profile: null,
      household: null,
      role: null,
    };
  }

  const membership = await getMembership(profile.id);
  if (!membership) {
    return {
      status: 'pending_household',
      session,
      profile,
      household: null,
      role: null,
    };
  }

  const household = await getHouseholdById(membership.householdId);
  if (!household) {
    return {
      status: 'pending_household',
      session,
      profile,
      household: null,
      role: membership.role,
    };
  }

  const memberCount = await getHouseholdMemberCount(household.id);

  if (memberCount < 2) {
    return {
      status: 'pending_household',
      session,
      profile,
      household,
      role: membership.role,
    };
  }

  return {
    status: 'linked',
    session,
    profile,
    household,
    role: membership.role,
  };
}

// Profiles
export async function getProfiles(householdId: string): Promise<Profile[]> {
  const { data: memberships, error: membershipsError } = await supabase
    .from('household_members')
    .select('profile_id')
    .eq('household_id', householdId);

  if (membershipsError) throw membershipsError;

  const profileIds = (memberships ?? []).map((membership) => membership.profile_id);
  if (profileIds.length === 0) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('id', profileIds)
    .order('name');

  if (error) throw error;
  return data ?? [];
}

export async function getProfileById(id: string, householdId: string): Promise<Profile | null> {
  const { data: membership, error: membershipError } = await supabase
    .from('household_members')
    .select('profile_id')
    .eq('household_id', householdId)
    .eq('profile_id', id)
    .maybeSingle();

  if (membershipError && !isNotFoundError(membershipError)) {
    throw membershipError;
  }

  if (!membership) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }

  return data;
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
  bio?: string;
  avatar_url?: string | null;
}

export async function updateProfile(id: string, input: UpdateProfileInput): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Tasks
export async function getTodaysTasks(householdId: string): Promise<Task[]> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('household_id', householdId)
    .eq('date', today)
    .eq('type', 'task')
    .in('status', ['pending', 'postponed'])
    .is('deleted_at', null)
    .order('priority', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getUpcomingEvents(householdId: string): Promise<Task[]> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('household_id', householdId)
    .eq('type', 'event')
    .gte('date', today)
    .neq('status', 'completed')
    .is('deleted_at', null)
    .order('date', { ascending: true })
    .limit(10);

  if (error) throw error;
  return data ?? [];
}

export async function getTaskById(id: string, householdId: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('household_id', householdId)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }

  return data;
}

export async function getTasksForMonth(
  year: number,
  month: number,
  includeDeleted = false,
  householdId: string,
): Promise<Task[]> {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = month === 11
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 2).padStart(2, '0')}-01`;

  let query = supabase
    .from('tasks')
    .select('*')
    .eq('household_id', householdId)
    .gte('date', startDate)
    .lt('date', endDate)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  type: 'task' | 'event';
  priority: 'critical' | 'flexible';
  date?: string;
  points?: number;
  is_recurring: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly' | null;
  recurrence_id?: string | null;
  assignment_type: 'strict_rotation' | 'team_work' | 'individual' | 'anyone';
  assigned_to?: string | null;
  location?: string;
  start_time?: string;
  end_time?: string;
}

function resolveAssignedToForInsert(
  input: Pick<CreateTaskInput, 'assignment_type' | 'assigned_to'>,
  currentProfileId: string,
): string | null {
  if (input.assignment_type === 'team_work' || input.assignment_type === 'anyone') {
    return null;
  }

  return input.assigned_to || currentProfileId;
}

interface MutationScope {
  householdId: string;
  profileId: string;
}

export async function createTask(input: CreateTaskInput, scope: MutationScope): Promise<Task> {
  const { householdId, profileId } = scope;

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...input,
      household_id: householdId,
      status: 'pending',
      created_by: profileId,
      assigned_to: resolveAssignedToForInsert(input, profileId),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createTasks(inputs: CreateTaskInput[], scope: MutationScope): Promise<Task[]> {
  const { householdId, profileId } = scope;

  const tasksToInsert = inputs.map((input) => ({
    ...input,
    household_id: householdId,
    status: 'pending',
    created_by: profileId,
    assigned_to: resolveAssignedToForInsert(input, profileId),
  }));

  const { data, error } = await supabase
    .from('tasks')
    .insert(tasksToInsert)
    .select();

  if (error) throw error;
  return data ?? [];
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {}

export async function updateTask(taskId: string, input: UpdateTaskInput, householdId: string): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('household_id', householdId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTask(taskId: string, householdId: string): Promise<void> {
  const { data: completions, error: completionsError } = await supabase
    .from('task_completions')
    .select('id')
    .eq('task_id', taskId)
    .eq('household_id', householdId);

  if (completionsError) throw completionsError;

  if (completions && completions.length > 0) {
    const { error } = await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', taskId)
      .eq('household_id', householdId);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('household_id', householdId);

    if (error) throw error;
  }
}

export async function updateTaskSeries(
  recurrenceId: string,
  fromDate: string,
  input: UpdateTaskInput,
  householdId: string,
): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('household_id', householdId)
    .eq('recurrence_id', recurrenceId)
    .gte('date', fromDate);

  if (error) throw error;
}

export async function deleteTaskSeries(
  recurrenceId: string,
  fromDate?: string,
): Promise<void> {
  const { error } = await supabase.rpc('delete_task_series_rpc', {
    p_recurrence_id: recurrenceId,
    p_from_date: fromDate || undefined,
  });

  if (error) throw error;
}

export async function deleteTasksAfter(
  recurrenceId: string,
  date: string,
): Promise<void> {
  const { error } = await supabase.rpc('delete_tasks_after_rpc', {
    p_recurrence_id: recurrenceId,
    p_date: date,
  });

  if (error) throw error;
}

export async function completeTask(taskId: string, scope: MutationScope): Promise<void> {
  const { householdId, profileId } = scope;

  const task = await getTaskById(taskId, householdId);
  if (!task) throw new Error('Task not found');

  const { error: updateError } = await supabase
    .from('tasks')
    .update({
      status: 'completed',
      last_done_by: profileId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('household_id', householdId);

  if (updateError) throw updateError;

  if (task.assignment_type === 'team_work') {
    const members = await getProfiles(householdId);

    if (members.length > 0) {
      const pointsPerMember = Math.floor(task.points / members.length);
      let remainder = task.points - pointsPerMember * members.length;

      const completions = members.map((member) => {
        const extraPoint = remainder > 0 ? 1 : 0;
        remainder = Math.max(0, remainder - 1);

        return {
          task_id: taskId,
          household_id: householdId,
          completed_by: member.id,
          points_earned: pointsPerMember + extraPoint,
        };
      });

      const { error: completionError } = await supabase
        .from('task_completions')
        .insert(completions);

      if (completionError) throw completionError;
      return;
    }
  }

  const { error: completionError } = await supabase
    .from('task_completions')
    .insert({
      task_id: taskId,
      household_id: householdId,
      completed_by: profileId,
      points_earned: task.points,
    });

  if (completionError) throw completionError;
}

export async function postponeTask(taskId: string, householdId: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({
      status: 'postponed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('household_id', householdId);

  if (error) throw error;
}

// Shopping
export async function getShoppingItems(householdId: string): Promise<ShoppingItem[]> {
  const { data, error } = await supabase
    .from('shopping_items')
    .select('*')
    .eq('household_id', householdId)
    .order('is_purchased', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function addShoppingItem(name: string, scope: MutationScope): Promise<ShoppingItem> {
  const { householdId, profileId } = scope;

  const { data, error } = await supabase
    .from('shopping_items')
    .insert({
      household_id: householdId,
      name,
      quantity: 1,
      is_purchased: false,
      added_by: profileId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function togglePurchased(id: string, currentValue: boolean, householdId: string): Promise<void> {
  const { error } = await supabase
    .from('shopping_items')
    .update({ is_purchased: !currentValue })
    .eq('id', id)
    .eq('household_id', householdId);

  if (error) throw error;
}

export async function updateQuantity(id: string, quantity: number, householdId: string): Promise<void> {
  if (quantity < 1) return;

  const { error } = await supabase
    .from('shopping_items')
    .update({ quantity })
    .eq('id', id)
    .eq('household_id', householdId);

  if (error) throw error;
}

export async function deleteShoppingItem(id: string, householdId: string): Promise<void> {
  const { error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('id', id)
    .eq('household_id', householdId);

  if (error) throw error;
}

// Love notes
export async function getLatestLoveNote(householdId: string): Promise<(LoveNote & { sender?: Profile }) | null> {
  const { data, error } = await supabase
    .from('love_notes')
    .select('*')
    .eq('household_id', householdId)
    .is('task_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }

  return data;
}

export async function getLoveNoteForTask(taskId: string, householdId: string): Promise<LoveNote | null> {
  const { data, error } = await supabase
    .from('love_notes')
    .select('*')
    .eq('household_id', householdId)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }

  return data;
}

// Metrics
export interface EquityMemberBalance {
  id: string;
  name: string;
  avatarUrl: string | null;
  percentage: number;
  points: number;
}

export interface EquityBalance {
  members: EquityMemberBalance[];
}

export async function getEquityBalance(householdId: string, profilesInput?: Profile[]): Promise<EquityBalance> {
  const { data, error } = await supabase
    .from('task_completions')
    .select('completed_by, points_earned')
    .eq('household_id', householdId);

  if (error) throw error;

  const members = profilesInput ?? await getProfiles(householdId);
  const memberPointsMap = new Map<string, number>(members.map((member) => [member.id, 0]));

  for (const completion of data ?? []) {
    const current = memberPointsMap.get(completion.completed_by) ?? 0;
    memberPointsMap.set(completion.completed_by, current + completion.points_earned);
  }

  const total = Array.from(memberPointsMap.values()).reduce((sum, points) => sum + points, 0);
  const denominator = total === 0 ? 1 : total;

  return {
    members: members.map((member) => {
      const points = memberPointsMap.get(member.id) ?? 0;
      return {
        id: member.id,
        name: member.name,
        avatarUrl: member.avatar_url,
        points,
        percentage: Math.round((points / denominator) * 100),
      };
    }),
  };
}

export interface WeeklyPulse {
  completedThisWeek: number;
  changeFromLastWeek: number;
}

export async function getWeeklyPulse(householdId: string): Promise<WeeklyPulse> {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  const { data: thisWeek, error: thisWeekError } = await supabase
    .from('task_completions')
    .select('id')
    .eq('household_id', householdId)
    .gte('completed_at', startOfWeek.toISOString());

  if (thisWeekError) throw thisWeekError;

  const { data: lastWeek, error: lastWeekError } = await supabase
    .from('task_completions')
    .select('id')
    .eq('household_id', householdId)
    .gte('completed_at', startOfLastWeek.toISOString())
    .lt('completed_at', startOfWeek.toISOString());

  if (lastWeekError) throw lastWeekError;

  return {
    completedThisWeek: thisWeek?.length ?? 0,
    changeFromLastWeek: (thisWeek?.length ?? 0) - (lastWeek?.length ?? 0),
  };
}

export interface PointsBreakdown {
  id: string;
  name: string;
  avatarUrl: string | null;
  taskPoints: number;
  kudosPoints: number;
  totalPoints: number;
}

export async function getPointsBreakdown(householdId: string, profilesInput?: Profile[]): Promise<PointsBreakdown[]> {
  const { data: completions, error: completionsError } = await supabase
    .from('task_completions')
    .select('completed_by, points_earned')
    .eq('household_id', householdId);

  if (completionsError) throw completionsError;

  const { data: kudosData, error: kudosError } = await supabase
    .from('kudos')
    .select('to_profile, points')
    .eq('household_id', householdId);

  if (kudosError) throw kudosError;

  const profiles = profilesInput ?? await getProfiles(householdId);

  return profiles.map((profile) => {
    const taskPoints = (completions ?? [])
      .filter((completion) => completion.completed_by === profile.id)
      .reduce((sum, completion) => sum + completion.points_earned, 0);

    const kudosPoints = (kudosData ?? [])
      .filter((kudo) => kudo.to_profile === profile.id)
      .reduce((sum, kudo) => sum + kudo.points, 0);

    return {
      id: profile.id,
      name: profile.name,
      avatarUrl: profile.avatar_url,
      taskPoints,
      kudosPoints,
      totalPoints: taskPoints + kudosPoints,
    };
  });
}

// Invites
function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

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
  if (error) throw error;
  return data as unknown as HouseholdInviteResult;
}

export async function getOrCreateHouseholdInvite(
  householdId: string,
  profileId: string,
): Promise<HouseholdInviteResult> {
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

  if (existingError) throw existingError;

  const existing = existingRows?.[0];
  if (existing) {
    return {
      household_id: existing.household_id,
      invite_code: existing.invite_code,
      expires_at: existing.expires_at,
    };
  }

  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = generateInviteCode();
    const { data: inserted, error: insertError } = await supabase
      .from('household_invites')
      .insert({
        household_id: householdId,
        created_by: profileId,
        invite_code: inviteCode,
        expires_at: expiresAt,
      })
      .select('household_id, invite_code, expires_at')
      .single();

    if (!insertError && inserted) {
      return {
        household_id: inserted.household_id,
        invite_code: inserted.invite_code,
        expires_at: inserted.expires_at,
      };
    }

    if (!insertError || insertError.code !== '23505') {
      throw insertError;
    }
  }

  throw new Error('Could not generate a unique invite code');
}

export async function acceptHouseholdInvite(inviteCode: string): Promise<AcceptInviteResult> {
  const { data, error } = await supabase.rpc('accept_household_invite', {
    p_invite_code: normalizeInviteCode(inviteCode),
  });
  if (error) throw error;
  return data as unknown as AcceptInviteResult;
}

export async function getInviteInfo(inviteCode: string): Promise<InviteInfo> {
  const { data, error } = await supabase.rpc('get_invite_info', {
    p_invite_code: normalizeInviteCode(inviteCode),
  });
  if (error) throw error;

  const raw = (data ?? {}) as Record<string, unknown>;
  const inviteCodeValue = typeof raw.invite_code === 'string' ? raw.invite_code : undefined;
  const foundValue =
    typeof raw.found === 'boolean'
      ? raw.found
      : Boolean(inviteCodeValue);

  return {
    found: foundValue,
    invite_code: inviteCodeValue,
    creator_name: typeof raw.creator_name === 'string' ? raw.creator_name : undefined,
    creator_avatar:
      typeof raw.creator_avatar === 'string' || raw.creator_avatar === null
        ? (raw.creator_avatar as string | null)
        : typeof raw.creator_avatar_url === 'string' || raw.creator_avatar_url === null
          ? (raw.creator_avatar_url as string | null)
          : undefined,
    creator_avatar_url:
      typeof raw.creator_avatar_url === 'string' || raw.creator_avatar_url === null
        ? (raw.creator_avatar_url as string | null)
        : undefined,
    is_expired: typeof raw.is_expired === 'boolean' ? raw.is_expired : undefined,
    is_accepted: typeof raw.is_accepted === 'boolean' ? raw.is_accepted : undefined,
    member_count: typeof raw.member_count === 'number' ? raw.member_count : undefined,
    expires_at: typeof raw.expires_at === 'string' ? raw.expires_at : undefined,
    household_id: typeof raw.household_id === 'string' ? raw.household_id : undefined,
  };
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
