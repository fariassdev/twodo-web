import { supabase } from './supabase';
import type {
  AuthContext,
  Household,
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

  return {
    status: 'linked',
    session,
    profile,
    household,
    role: membership.role,
  };
}

interface LinkedAuthContext {
  profile: Profile;
  household: Household;
}

async function requireLinkedAuthContext(): Promise<LinkedAuthContext> {
  const context = await getAuthContext();

  if (context.status !== 'linked' || !context.profile || !context.household) {
    throw new Error('AUTH_CONTEXT_NOT_READY');
  }

  return {
    profile: context.profile,
    household: context.household,
  };
}

// Profiles
export async function getProfiles(): Promise<Profile[]> {
  const { household } = await requireLinkedAuthContext();

  const { data: memberships, error: membershipsError } = await supabase
    .from('household_members')
    .select('profile_id')
    .eq('household_id', household.id);

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

export async function getProfileById(id: string): Promise<Profile | null> {
  const { household } = await requireLinkedAuthContext();

  const { data: membership, error: membershipError } = await supabase
    .from('household_members')
    .select('profile_id')
    .eq('household_id', household.id)
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
export async function getTodaysTasks(): Promise<Task[]> {
  const { household } = await requireLinkedAuthContext();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('household_id', household.id)
    .eq('date', today)
    .eq('type', 'task')
    .in('status', ['pending', 'postponed'])
    .is('deleted_at', null)
    .order('priority', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getUpcomingEvents(): Promise<Task[]> {
  const { household } = await requireLinkedAuthContext();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('household_id', household.id)
    .eq('type', 'event')
    .gte('date', today)
    .neq('status', 'completed')
    .is('deleted_at', null)
    .order('date', { ascending: true })
    .limit(10);

  if (error) throw error;
  return data ?? [];
}

export async function getTaskById(id: string): Promise<Task | null> {
  const { household } = await requireLinkedAuthContext();

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('household_id', household.id)
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
): Promise<Task[]> {
  const { household } = await requireLinkedAuthContext();
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = month === 11
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 2).padStart(2, '0')}-01`;

  let query = supabase
    .from('tasks')
    .select('*')
    .eq('household_id', household.id)
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

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const { profile, household } = await requireLinkedAuthContext();

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...input,
      household_id: household.id,
      status: 'pending',
      created_by: profile.id,
      assigned_to: resolveAssignedToForInsert(input, profile.id),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createTasks(inputs: CreateTaskInput[]): Promise<Task[]> {
  const { profile, household } = await requireLinkedAuthContext();

  const tasksToInsert = inputs.map((input) => ({
    ...input,
    household_id: household.id,
    status: 'pending',
    created_by: profile.id,
    assigned_to: resolveAssignedToForInsert(input, profile.id),
  }));

  const { data, error } = await supabase
    .from('tasks')
    .insert(tasksToInsert)
    .select();

  if (error) throw error;
  return data ?? [];
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {}

export async function updateTask(taskId: string, input: UpdateTaskInput): Promise<Task> {
  const { household } = await requireLinkedAuthContext();

  const { data, error } = await supabase
    .from('tasks')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('household_id', household.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTask(taskId: string): Promise<void> {
  const { household } = await requireLinkedAuthContext();

  const { data: completions, error: completionsError } = await supabase
    .from('task_completions')
    .select('id')
    .eq('task_id', taskId)
    .eq('household_id', household.id);

  if (completionsError) throw completionsError;

  if (completions && completions.length > 0) {
    const { error } = await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', taskId)
      .eq('household_id', household.id);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('household_id', household.id);

    if (error) throw error;
  }
}

export async function updateTaskSeries(
  recurrenceId: string,
  fromDate: string,
  input: UpdateTaskInput,
): Promise<void> {
  const { household } = await requireLinkedAuthContext();

  const { error } = await supabase
    .from('tasks')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('household_id', household.id)
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

export async function completeTask(taskId: string): Promise<void> {
  const { profile, household } = await requireLinkedAuthContext();

  const task = await getTaskById(taskId);
  if (!task) throw new Error('Task not found');

  const { error: updateError } = await supabase
    .from('tasks')
    .update({
      status: 'completed',
      last_done_by: profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('household_id', household.id);

  if (updateError) throw updateError;

  if (task.assignment_type === 'team_work') {
    const members = await getProfiles();

    if (members.length > 0) {
      const pointsPerMember = Math.floor(task.points / members.length);
      let remainder = task.points - pointsPerMember * members.length;

      const completions = members.map((member) => {
        const extraPoint = remainder > 0 ? 1 : 0;
        remainder = Math.max(0, remainder - 1);

        return {
          task_id: taskId,
          household_id: household.id,
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
      household_id: household.id,
      completed_by: profile.id,
      points_earned: task.points,
    });

  if (completionError) throw completionError;
}

export async function postponeTask(taskId: string): Promise<void> {
  const { household } = await requireLinkedAuthContext();

  const { error } = await supabase
    .from('tasks')
    .update({
      status: 'postponed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('household_id', household.id);

  if (error) throw error;
}

// Shopping
export async function getShoppingItems(): Promise<ShoppingItem[]> {
  const { household } = await requireLinkedAuthContext();

  const { data, error } = await supabase
    .from('shopping_items')
    .select('*')
    .eq('household_id', household.id)
    .order('is_purchased', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function addShoppingItem(name: string): Promise<ShoppingItem> {
  const { profile, household } = await requireLinkedAuthContext();

  const { data, error } = await supabase
    .from('shopping_items')
    .insert({
      household_id: household.id,
      name,
      quantity: 1,
      is_purchased: false,
      added_by: profile.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function togglePurchased(id: string, currentValue: boolean): Promise<void> {
  const { household } = await requireLinkedAuthContext();

  const { error } = await supabase
    .from('shopping_items')
    .update({ is_purchased: !currentValue })
    .eq('id', id)
    .eq('household_id', household.id);

  if (error) throw error;
}

export async function updateQuantity(id: string, quantity: number): Promise<void> {
  if (quantity < 1) return;

  const { household } = await requireLinkedAuthContext();

  const { error } = await supabase
    .from('shopping_items')
    .update({ quantity })
    .eq('id', id)
    .eq('household_id', household.id);

  if (error) throw error;
}

export async function deleteShoppingItem(id: string): Promise<void> {
  const { household } = await requireLinkedAuthContext();

  const { error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('id', id)
    .eq('household_id', household.id);

  if (error) throw error;
}

// Love notes
export async function getLatestLoveNote(): Promise<(LoveNote & { sender?: Profile }) | null> {
  const { household } = await requireLinkedAuthContext();

  const { data, error } = await supabase
    .from('love_notes')
    .select('*')
    .eq('household_id', household.id)
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

export async function getLoveNoteForTask(taskId: string): Promise<LoveNote | null> {
  const { household } = await requireLinkedAuthContext();

  const { data, error } = await supabase
    .from('love_notes')
    .select('*')
    .eq('household_id', household.id)
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

export async function getEquityBalance(profilesInput?: Profile[]): Promise<EquityBalance> {
  const { household } = await requireLinkedAuthContext();

  const { data, error } = await supabase
    .from('task_completions')
    .select('completed_by, points_earned')
    .eq('household_id', household.id);

  if (error) throw error;

  const members = profilesInput ?? await getProfiles();
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

export async function getWeeklyPulse(): Promise<WeeklyPulse> {
  const { household } = await requireLinkedAuthContext();

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  const { data: thisWeek, error: thisWeekError } = await supabase
    .from('task_completions')
    .select('id')
    .eq('household_id', household.id)
    .gte('completed_at', startOfWeek.toISOString());

  if (thisWeekError) throw thisWeekError;

  const { data: lastWeek, error: lastWeekError } = await supabase
    .from('task_completions')
    .select('id')
    .eq('household_id', household.id)
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

export async function getPointsBreakdown(profilesInput?: Profile[]): Promise<PointsBreakdown[]> {
  const { household } = await requireLinkedAuthContext();

  const { data: completions, error: completionsError } = await supabase
    .from('task_completions')
    .select('completed_by, points_earned')
    .eq('household_id', household.id);

  if (completionsError) throw completionsError;

  const { data: kudosData, error: kudosError } = await supabase
    .from('kudos')
    .select('to_profile, points')
    .eq('household_id', household.id);

  if (kudosError) throw kudosError;

  const profiles = profilesInput ?? await getProfiles();

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
