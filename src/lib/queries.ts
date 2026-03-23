import { supabase } from './supabase';
import type {
  AcceptInviteResult,
  AuthContext,
  Expense,
  ExpenseCategory,
  ExpenseWithDetails,
  Household,
  HouseholdInviteResult,
  InviteInfo,
  LoveNote,
  Profile,
  ShoppingItem,
  Settlement,
  Task,
  TaskCompletionWithProfile,
  TaskCatalogItem,
} from './types';
import { EFFORT_POINTS, type EffortLevel } from './schemas';

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
const TASK_FULL_QUERY = `
  *,
  assigned_profile:profiles!tasks_assigned_to_fkey(*),
  last_done_by_profile:profiles!tasks_last_done_by_fkey(*)
`;

export async function getTodaysTasks(householdId: string): Promise<Task[]> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_FULL_QUERY)
    .eq('household_id', householdId)
    .eq('date', today)
    .eq('type', 'task')
    .in('status', ['pending', 'postponed', 'completed'])
    .is('deleted_at', null)
    .order('priority', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getOverdueTasks(householdId: string): Promise<Task[]> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_FULL_QUERY)
    .eq('household_id', householdId)
    .eq('type', 'task')
    .lt('date', today)
    .or(`status.in.(pending,postponed,overdue),and(status.eq.completed,updated_at.gte.${today})`)
    .is('deleted_at', null)
    .order('date', { ascending: true });

  if (error) throw error;

  const filteredData = (data ?? []).filter(t => t.frequency !== 'daily');

  // Mark overdue tasks lazily
  const toMarkOverdue = filteredData.filter(t => t.status === 'pending' || t.status === 'postponed');
  if (toMarkOverdue.length > 0) {
    const ids = toMarkOverdue.map(t => t.id);
    await supabase
      .from('tasks')
      .update({ status: 'overdue', updated_at: new Date().toISOString() })
      .in('id', ids)
      .eq('household_id', householdId);

    // Return with updated status
    return filteredData.map(t =>
      ids.includes(t.id) ? { ...t, status: 'overdue' } : t
    );
  }

  return filteredData;
}

export async function getUpcomingTasks(householdId: string, daysLimit: number = 7): Promise<Task[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // start of today
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + daysLimit);

  const todayStr = today.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('tasks')
    .select('*, assigned_profile:profiles!tasks_assigned_to_fkey(*)')
    .eq('household_id', householdId)
    .eq('type', 'task')
    .neq('status', 'completed')
    .gte('date', todayStr)
    .lte('date', endDateStr)
    .is('deleted_at', null)
    .order('date', { ascending: true });

  if (error) throw error;
  
  return (data ?? []).filter(task => task.frequency !== 'daily');
}

export async function expireDailyTasks(householdId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const { error } = await supabase
    .from('tasks')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('household_id', householdId)
    .eq('type', 'task')
    .eq('frequency', 'daily')
    .lt('date', today)
    .in('status', ['pending', 'postponed'])
    .is('deleted_at', null);

  if (error) throw error;
}

export async function getTaskCatalog(): Promise<TaskCatalogItem[]> {
  const { data, error } = await supabase
    .from('task_catalog')
    .select('*')
    .order('sort_order', { ascending: true });

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
    .select(TASK_FULL_QUERY)
    .eq('household_id', householdId)
    .eq('id', id)
    .maybeSingle()
    .overrideTypes<Task | null, { merge: false }>();

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
  priority: 'normal' | 'high';
  date?: string;
  points?: number;
  effort_level?: EffortLevel;
  time_of_day?: 'morning' | 'afternoon' | 'evening' | 'anytime';
  category?: string;
  catalog_task_id?: string | null;
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

export type TaskAssignmentOverrideType = 'team_work' | 'individual' | 'anyone';

export interface TaskAssignmentOverride {
  type: TaskAssignmentOverrideType;
  assignedTo?: string[];
}

function splitPointsAcrossRecipients(totalPoints: number, recipientIds: string[]) {
  if (recipientIds.length === 0) return [] as Array<{ completed_by: string; points_earned: number }>;

  const pointsPerMember = Math.floor(totalPoints / recipientIds.length);
  let remainder = totalPoints - pointsPerMember * recipientIds.length;

  return recipientIds.map((recipientId) => {
    const extraPoint = remainder > 0 ? 1 : 0;
    remainder = Math.max(0, remainder - 1);
    return {
      completed_by: recipientId,
      points_earned: pointsPerMember + extraPoint,
    };
  });
}

async function resolveAssignmentRecipients(
  task: Task,
  scope: MutationScope,
  assignmentOverride?: TaskAssignmentOverride,
): Promise<{
  assignmentType: TaskAssignmentOverrideType | 'strict_rotation';
  assignedTo: string | null;
  recipientIds: string[];
}> {
  if (assignmentOverride?.type === 'team_work') {
    const members = await getProfiles(scope.householdId);
    const recipientIds = members.map((member) => member.id);
    return {
      assignmentType: 'team_work',
      assignedTo: null,
      recipientIds: recipientIds.length > 0 ? recipientIds : [scope.profileId],
    };
  }

  if (assignmentOverride?.type === 'individual') {
    const selectedProfileId = assignmentOverride.assignedTo?.[0] ?? task.assigned_to ?? scope.profileId;
    return {
      assignmentType: 'individual',
      assignedTo: selectedProfileId,
      recipientIds: [selectedProfileId],
    };
  }

  if (assignmentOverride?.type === 'anyone') {
    return {
      assignmentType: 'anyone',
      assignedTo: null,
      recipientIds: [scope.profileId],
    };
  }

  if (task.assignment_type === 'team_work') {
    const members = await getProfiles(scope.householdId);
    const recipientIds = members.map((member) => member.id);
    return {
      assignmentType: 'team_work',
      assignedTo: null,
      recipientIds: recipientIds.length > 0 ? recipientIds : [scope.profileId],
    };
  }

  return {
    assignmentType: task.assignment_type as TaskAssignmentOverrideType | 'strict_rotation',
    assignedTo: task.assigned_to,
    recipientIds: [scope.profileId],
  };
}

async function replaceTaskCompletions(
  taskId: string,
  householdId: string,
  points: number,
  recipientIds: string[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('task_completions')
    .delete()
    .eq('task_id', taskId)
    .eq('household_id', householdId);

  if (deleteError) throw deleteError;

  const splitCompletions = splitPointsAcrossRecipients(points, recipientIds);
  const completions = splitCompletions.map((completion) => ({
    task_id: taskId,
    household_id: householdId,
    completed_by: completion.completed_by,
    points_earned: completion.points_earned,
  }));

  const { error: insertError } = await supabase.from('task_completions').insert(completions);
  if (insertError) throw insertError;
}

export async function createTask(input: CreateTaskInput, scope: MutationScope): Promise<Task> {
  const { householdId, profileId } = scope;

  // Compute points from effort_level for tasks
  const points = input.type === 'task' && input.effort_level
    ? EFFORT_POINTS[input.effort_level]
    : (input.points ?? 10);

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...input,
      points,
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

  const tasksToInsert = inputs.map((input) => {
    const points = input.type === 'task' && input.effort_level
      ? EFFORT_POINTS[input.effort_level]
      : (input.points ?? 10);

    return {
      ...input,
      points,
      household_id: householdId,
      status: 'pending',
      created_by: profileId,
      assigned_to: resolveAssignedToForInsert(input, profileId),
    };
  });

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

export async function completeTask(
  taskId: string,
  scope: MutationScope,
  assignmentOverride?: TaskAssignmentOverride,
): Promise<void> {
  const { householdId, profileId } = scope;

  const task = await getTaskById(taskId, householdId);
  if (!task) throw new Error('Task not found');

  const assignment = await resolveAssignmentRecipients(task, scope, assignmentOverride);

  const { error: updateError } = await supabase
    .from('tasks')
    .update({
      status: 'completed',
      last_done_by: profileId,
      assignment_type: assignment.assignmentType,
      assigned_to: assignment.assignedTo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('household_id', householdId);

  if (updateError) throw updateError;

  await replaceTaskCompletions(taskId, householdId, task.points, assignment.recipientIds);
}

export async function getTaskCompletions(
  taskId: string,
  householdId: string,
): Promise<TaskCompletionWithProfile[]> {
  const { data, error } = await supabase
    .from('task_completions')
    .select('*, profile:profiles(*)')
    .eq('task_id', taskId)
    .eq('household_id', householdId)
    .order('completed_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as TaskCompletionWithProfile[];
}

export async function updateTaskCompletionAssignment(
  taskId: string,
  assignmentType: TaskAssignmentOverrideType,
  assignedTo: string[],
  scope: MutationScope,
): Promise<void> {
  const task = await getTaskById(taskId, scope.householdId);
  if (!task) throw new Error('Task not found');
  if (task.status !== 'completed') throw new Error('Task is not completed');

  const assignment = await resolveAssignmentRecipients(task, scope, {
    type: assignmentType,
    assignedTo,
  });

  const { error: updateError } = await supabase
    .from('tasks')
    .update({
      assignment_type: assignment.assignmentType,
      assigned_to: assignment.assignedTo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('household_id', scope.householdId);

  if (updateError) throw updateError;

  await replaceTaskCompletions(taskId, scope.householdId, task.points, assignment.recipientIds);
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

export async function getBalanceScore(householdId: string, startDate: string, endDate: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('task_completions')
    .select('completed_by, points_earned')
    .eq('household_id', householdId)
    .gte('completed_at', startDate)
    .lte('completed_at', endDate);

  if (error) throw error;
  
  const score: Record<string, number> = {};
  data?.forEach(completion => {
    if (completion.completed_by) {
      score[completion.completed_by] = (score[completion.completed_by] || 0) + (completion.points_earned || 1);
    }
  });

  return score;
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

// Expenses
export interface ExpenseBalanceSnapshot {
  balanceCents: number;
  amountCents: number;
  direction: 'you_owe' | 'you_are_owed' | 'settled';
  counterpartyProfile: Profile | null;
  lastSettlementAt: string | null;
}

export interface ExpenseDashboardData {
  balance: ExpenseBalanceSnapshot;
  recentExpenses: ExpenseWithDetails[];
}

export interface ExpenseFilters {
  categoryId?: string;
  paidByProfileId?: string;
  searchText?: string;
  fromDate?: string;
  toDate?: string;
}

export interface CreateExpenseInput {
  amountCents: number;
  description?: string;
  categoryId: string;
  paidByProfileId: string;
  expenseDate: string;
}

export type UpdateExpenseInput = Partial<CreateExpenseInput>;

export interface SettlementWithDetails extends Settlement {
  paid_by_profile?: Profile | null;
  paid_to_profile?: Profile | null;
  created_by_profile?: Profile | null;
}

export interface ExpenseActivityFeedExpenseItem {
  type: 'expense';
  id: string;
  activity_day: string;
  activity_at: string;
  created_at: string;
  expense: ExpenseWithDetails;
}

export interface ExpenseActivityFeedSettlementItem {
  type: 'settlement';
  id: string;
  activity_day: string;
  activity_at: string;
  created_at: string;
  settlement: SettlementWithDetails;
}

export type ExpenseActivityFeedItem = ExpenseActivityFeedExpenseItem | ExpenseActivityFeedSettlementItem;

export interface ExpenseActivityFeedPage {
  items: ExpenseActivityFeedItem[];
  pageIndex: number;
  pageSize: number;
  hasMore: boolean;
}

function normalizeAmountCents(amountCents: number): number {
  return Math.max(1, Math.round(amountCents));
}

async function mapExpensesWithDetails(expenses: Expense[], householdId: string): Promise<ExpenseWithDetails[]> {
  if (expenses.length === 0) return [];

  const [categories, profiles] = await Promise.all([getExpenseCategories(), getProfiles(householdId)]);

  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  return expenses.map((expense) => ({
    ...expense,
    category: categoryMap.get(expense.category_id) ?? null,
    paid_by_profile: profileMap.get(expense.paid_by_profile_id) ?? null,
    created_by_profile: profileMap.get(expense.created_by_profile_id) ?? null,
  }));
}

function mapExpensesWithLookups(
  expenses: Expense[],
  categories: ExpenseCategory[],
  profiles: Profile[],
): ExpenseWithDetails[] {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  return expenses.map((expense) => ({
    ...expense,
    category: categoryMap.get(expense.category_id) ?? null,
    paid_by_profile: profileMap.get(expense.paid_by_profile_id) ?? null,
    created_by_profile: profileMap.get(expense.created_by_profile_id) ?? null,
  }));
}

function mapSettlementsWithDetails(settlements: Settlement[], profiles: Profile[]): SettlementWithDetails[] {
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  return settlements.map((settlement) => ({
    ...settlement,
    paid_by_profile: profileMap.get(settlement.paid_by_profile_id) ?? null,
    paid_to_profile: profileMap.get(settlement.paid_to_profile_id) ?? null,
    created_by_profile: profileMap.get(settlement.created_by_profile_id) ?? null,
  }));
}

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getExpenseBalanceSnapshot(
  householdId: string,
  profileId: string,
): Promise<ExpenseBalanceSnapshot> {
  const [{ data: latestSettlement, error: latestSettlementError }, profiles] = await Promise.all([
    supabase
      .from('settlements')
      .select('settled_at')
      .eq('household_id', householdId)
      .order('settled_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    getProfiles(householdId),
  ]);

  if (latestSettlementError && !isNotFoundError(latestSettlementError)) {
    throw latestSettlementError;
  }

  const lastSettlementAt = latestSettlement?.settled_at ?? null;

  let eventsQuery = supabase
    .from('expense_balance_events')
    .select('from_profile_id, to_profile_id, amount_cents')
    .eq('household_id', householdId);

  if (lastSettlementAt) {
    eventsQuery = eventsQuery.gt('created_at', lastSettlementAt);
  }

  const { data: events, error: eventsError } = await eventsQuery;
  if (eventsError) throw eventsError;

  const balanceCents = (events ?? []).reduce((acc, event) => {
    if (event.to_profile_id === profileId) return acc + event.amount_cents;
    if (event.from_profile_id === profileId) return acc - event.amount_cents;
    return acc;
  }, 0);

  const counterpartyProfile = profiles.find((profile) => profile.id !== profileId) ?? null;

  if (balanceCents > 0) {
    return {
      balanceCents,
      amountCents: balanceCents,
      direction: 'you_are_owed',
      counterpartyProfile,
      lastSettlementAt,
    };
  }

  if (balanceCents < 0) {
    return {
      balanceCents,
      amountCents: Math.abs(balanceCents),
      direction: 'you_owe',
      counterpartyProfile,
      lastSettlementAt,
    };
  }

  return {
    balanceCents: 0,
    amountCents: 0,
    direction: 'settled',
    counterpartyProfile,
    lastSettlementAt,
  };
}

export async function getRecentExpenses(householdId: string, limit = 5): Promise<ExpenseWithDetails[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('household_id', householdId)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return mapExpensesWithDetails(data ?? [], householdId);
}

export async function getExpensesDashboard(
  householdId: string,
  profileId: string,
): Promise<ExpenseDashboardData> {
  const [balance, recentExpenses] = await Promise.all([
    getExpenseBalanceSnapshot(householdId, profileId),
    getRecentExpenses(householdId, 5),
  ]);

  return {
    balance,
    recentExpenses,
  };
}

export async function getExpensesList(
  householdId: string,
  filters: ExpenseFilters = {},
): Promise<ExpenseWithDetails[]> {
  const searchText = filters.searchText?.trim();
  const fromDate = filters.fromDate?.trim();
  const toDate = filters.toDate?.trim();

  if (searchText) {
    const { data, error } = await supabase.rpc('search_expenses', {
      p_household_id: householdId,
      p_search_term: searchText,
      p_category_id: filters.categoryId || undefined,
      p_paid_by_profile_id: filters.paidByProfileId || undefined,
      p_from_date: fromDate || undefined,
      p_to_date: toDate || undefined,
    });

    if (error) throw error;
    return mapExpensesWithDetails(data ?? [], householdId);
  }

  let query = supabase
    .from('expenses')
    .select('*')
    .eq('household_id', householdId);

  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  if (filters.paidByProfileId) {
    query = query.eq('paid_by_profile_id', filters.paidByProfileId);
  }

  if (fromDate) {
    query = query.gte('expense_date', fromDate);
  }

  if (toDate) {
    query = query.lte('expense_date', toDate);
  }

  const { data, error } = await query
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return mapExpensesWithDetails(data ?? [], householdId);
}

export async function getExpenseById(expenseId: string, householdId: string): Promise<ExpenseWithDetails | null> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('household_id', householdId)
    .eq('id', expenseId)
    .maybeSingle();

  if (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }

  if (!data) return null;

  const [mapped] = await mapExpensesWithDetails([data], householdId);
  return mapped ?? null;
}

export async function createExpense(input: CreateExpenseInput, scope: MutationScope): Promise<ExpenseWithDetails> {
  const payload = {
    household_id: scope.householdId,
    paid_by_profile_id: input.paidByProfileId,
    created_by_profile_id: scope.profileId,
    category_id: input.categoryId,
    amount_cents: normalizeAmountCents(input.amountCents),
    description: input.description?.trim() || null,
    expense_date: input.expenseDate,
  };

  const { data, error } = await supabase
    .from('expenses')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;

  const [mapped] = await mapExpensesWithDetails([data], scope.householdId);
  return mapped;
}

export async function updateExpense(
  expenseId: string,
  input: UpdateExpenseInput,
  scope: MutationScope,
): Promise<ExpenseWithDetails> {
  const payload: Record<string, unknown> = {};

  if (typeof input.amountCents === 'number') payload.amount_cents = normalizeAmountCents(input.amountCents);
  if (typeof input.description !== 'undefined') payload.description = input.description?.trim() || null;
  if (typeof input.categoryId === 'string') payload.category_id = input.categoryId;
  if (typeof input.paidByProfileId === 'string') payload.paid_by_profile_id = input.paidByProfileId;
  if (typeof input.expenseDate === 'string') payload.expense_date = input.expenseDate;

  const { data, error } = await supabase
    .from('expenses')
    .update(payload)
    .eq('id', expenseId)
    .eq('household_id', scope.householdId)
    .select('*')
    .single();

  if (error) throw error;

  const [mapped] = await mapExpensesWithDetails([data], scope.householdId);
  return mapped;
}

export async function deleteExpense(expenseId: string, householdId: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId)
    .eq('household_id', householdId);

  if (error) throw error;
}

export async function getSettlementsHistory(householdId: string): Promise<SettlementWithDetails[]> {
  const [{ data, error }, profiles] = await Promise.all([
    supabase
      .from('settlements')
      .select('*')
      .eq('household_id', householdId)
      .order('settled_at', { ascending: false })
      .order('created_at', { ascending: false }),
    getProfiles(householdId),
  ]);

  if (error) throw error;
  return mapSettlementsWithDetails(data ?? [], profiles);
}

function toEpoch(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export async function getExpensesActivityFeedPage(
  householdId: string,
  pageSize = 20,
  pageIndex = 0,
): Promise<ExpenseActivityFeedPage> {
  const normalizedPageSize = Math.max(1, Math.floor(pageSize));
  const normalizedPageIndex = Math.max(0, Math.floor(pageIndex));
  const endIndex = (normalizedPageIndex + 1) * normalizedPageSize;
  const fetchLimit = endIndex + 1;

  const [
    { data: expenseRows, error: expensesError },
    { data: settlementRows, error: settlementsError },
    categories,
    profiles,
  ] = await Promise.all([
    supabase
      .from('expenses')
      .select('*')
      .eq('household_id', householdId)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(fetchLimit),
    supabase
      .from('settlements')
      .select('*')
      .eq('household_id', householdId)
      .order('settled_at', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(fetchLimit),
    getExpenseCategories(),
    getProfiles(householdId),
  ]);

  if (expensesError) throw expensesError;
  if (settlementsError) throw settlementsError;

  const mappedExpenses = mapExpensesWithLookups(expenseRows ?? [], categories, profiles);
  const mappedSettlements = mapSettlementsWithDetails(settlementRows ?? [], profiles);

  const combined: ExpenseActivityFeedItem[] = [
    ...mappedExpenses.map((expense) => ({
      type: 'expense' as const,
      id: expense.id,
      activity_day: expense.expense_date,
      activity_at: `${expense.expense_date}T00:00:00`,
      created_at: expense.created_at,
      expense,
    })),
    ...mappedSettlements.map((settlement) => ({
      type: 'settlement' as const,
      id: settlement.id,
      activity_day: settlement.settled_at.slice(0, 10),
      activity_at: settlement.settled_at,
      created_at: settlement.created_at,
      settlement,
    })),
  ].sort((left, right) => {
    const byActivity = toEpoch(right.activity_at) - toEpoch(left.activity_at);
    if (byActivity !== 0) return byActivity;

    const byCreatedAt = toEpoch(right.created_at) - toEpoch(left.created_at);
    if (byCreatedAt !== 0) return byCreatedAt;

    if (left.type !== right.type) {
      return left.type === 'settlement' ? -1 : 1;
    }

    return right.id.localeCompare(left.id);
  });

  const startIndex = normalizedPageIndex * normalizedPageSize;

  return {
    items: combined.slice(startIndex, endIndex),
    pageIndex: normalizedPageIndex,
    pageSize: normalizedPageSize,
    hasMore: combined.length > endIndex,
  };
}

export async function createSettlement(
  input: { note?: string },
  scope: MutationScope,
): Promise<SettlementWithDetails> {
  const balance = await getExpenseBalanceSnapshot(scope.householdId, scope.profileId);

  if (balance.direction === 'settled' || !balance.counterpartyProfile) {
    throw new Error('Cannot create a settlement when the balance is zero.');
  }

  const payerId = balance.direction === 'you_owe' ? scope.profileId : balance.counterpartyProfile.id;
  const receiverId = balance.direction === 'you_owe' ? balance.counterpartyProfile.id : scope.profileId;

  const payload = {
    household_id: scope.householdId,
    paid_by_profile_id: payerId,
    paid_to_profile_id: receiverId,
    created_by_profile_id: scope.profileId,
    amount_cents: balance.amountCents,
    note: input.note?.trim() || null,
    settled_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('settlements')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;

  const profiles = await getProfiles(scope.householdId);
  const [mapped] = mapSettlementsWithDetails([data], profiles);
  return mapped;
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
