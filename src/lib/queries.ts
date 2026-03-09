import { supabase, getActiveProfileId, MAIN_ID, PARTNER_ID } from './supabase';
import type { Task, ShoppingItem, LoveNote, Profile } from './types';

// ─── Profiles ───────────────────────────────────────────
export async function getProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
  bio?: string;
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

// ─── Tasks ──────────────────────────────────────────────
export async function getTodaysTasks(): Promise<Task[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('date', today)
    .eq('type', 'task')
    .in('status', ['pending', 'postponed'])
    .is('deleted_at', null)
    .order('priority', { ascending: true }); // critical first
  if (error) throw error;
  return data ?? [];
}

export async function getUpcomingEvents(): Promise<Task[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
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
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

export async function getTasksForMonth(year: number, month: number, includeDeleted = false): Promise<Task[]> {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = month === 11
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 2).padStart(2, '0')}-01`;

  let query = supabase
    .from('tasks')
    .select('*')
    .gte('date', startDate)
    .lt('date', endDate)
    .order('date', { ascending: true });

  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getTasksForDate(date: string, includeDeleted = false): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('date', date)
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
  assignment_type: 'strict_rotation' | 'team_work' | 'individual';
  assigned_to?: string | null;
  location?: string;
  start_time?: string;
  end_time?: string;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...input,
      status: 'pending',
      created_by: getActiveProfileId(),
      assigned_to: input.assigned_to || getActiveProfileId(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createTasks(inputs: CreateTaskInput[]): Promise<Task[]> {
  const tasksToInsert = inputs.map(input => ({
    ...input,
    status: 'pending',
    created_by: getActiveProfileId(),
    assigned_to: input.assigned_to || getActiveProfileId(),
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
  const { data, error } = await supabase
    .from('tasks')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTask(taskId: string): Promise<void> {
  const { data: completions } = await supabase
    .from('task_completions')
    .select('id')
    .eq('task_id', taskId);

  if (completions && completions.length > 0) {
    const { error } = await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', taskId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);
    if (error) throw error;
  }
}

export async function updateTaskSeries(
  recurrenceId: string,
  fromDate: string,
  input: UpdateTaskInput
): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('recurrence_id', recurrenceId)
    .gte('date', fromDate);
  if (error) throw error;
}

export async function deleteTaskSeries(
  recurrenceId: string,
  fromDate?: string
): Promise<void> {
  const { error } = await supabase.rpc('delete_task_series_rpc', {
    p_recurrence_id: recurrenceId,
    p_from_date: fromDate || undefined,
  });
  
  if (error) throw error;
}

export async function deleteTasksAfter(
  recurrenceId: string,
  date: string
): Promise<void> {
  const { error } = await supabase.rpc('delete_tasks_after_rpc', {
    p_recurrence_id: recurrenceId,
    p_date: date,
  });

  if (error) throw error;
}
export async function completeTask(taskId: string): Promise<void> {
  // Get the task for points
  const task = await getTaskById(taskId);
  if (!task) throw new Error('Task not found');

  // Update task status
  const { error: updateError } = await supabase
    .from('tasks')
    .update({
      status: 'completed',
      last_done_by: getActiveProfileId(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId);
  if (updateError) throw updateError;

  // Record completion
  if (task.assignment_type === 'team_work') {
    const profiles = await getProfiles();
    if (profiles.length === 2) {
      const halfPoints = Math.floor(task.points / 2);
      const { error: completionError } = await supabase
        .from('task_completions')
        .insert([
          {
            task_id: taskId,
            completed_by: profiles[0].id,
            points_earned: halfPoints,
          },
          {
            task_id: taskId,
            completed_by: profiles[1].id,
            points_earned: task.points - halfPoints,
          }
        ]);
      if (completionError) throw completionError;
    } else {
      const { error: completionError } = await supabase
        .from('task_completions')
        .insert({
          task_id: taskId,
          completed_by: getActiveProfileId(),
          points_earned: task.points,
        });
      if (completionError) throw completionError;
    }
  } else {
    const { error: completionError } = await supabase
      .from('task_completions')
      .insert({
        task_id: taskId,
        completed_by: getActiveProfileId(),
        points_earned: task.points,
      });
    if (completionError) throw completionError;
  }
}

export async function postponeTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({
      status: 'postponed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId);
  if (error) throw error;
}

// ─── Shopping ───────────────────────────────────────────
export async function getShoppingItems(): Promise<ShoppingItem[]> {
  const { data, error } = await supabase
    .from('shopping_items')
    .select('*')
    .order('is_purchased', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addShoppingItem(name: string): Promise<ShoppingItem> {
  const { data, error } = await supabase
    .from('shopping_items')
    .insert({
      name,
      quantity: 1,
      is_purchased: false,
      added_by: getActiveProfileId(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function togglePurchased(id: string, currentValue: boolean): Promise<void> {
  const { error } = await supabase
    .from('shopping_items')
    .update({ is_purchased: !currentValue })
    .eq('id', id);
  if (error) throw error;
}

export async function updateQuantity(id: string, quantity: number): Promise<void> {
  if (quantity < 1) return;
  const { error } = await supabase
    .from('shopping_items')
    .update({ quantity })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteShoppingItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── Love Notes ─────────────────────────────────────────
export async function getLatestLoveNote(): Promise<(LoveNote & { sender?: Profile }) | null> {
  const { data, error } = await supabase
    .from('love_notes')
    .select('*')
    .is('task_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error) return null;
  return data;
}

export async function getLoveNoteForTask(taskId: string): Promise<LoveNote | null> {
  const { data, error } = await supabase
    .from('love_notes')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error) return null;
  return data;
}

// ─── Metrics ────────────────────────────────────────────
export interface EquityBalance {
  mainPercentage: number;
  partnerPercentage: number;
  mainName: string;
  partnerName: string;
}

export async function getEquityBalance(): Promise<EquityBalance> {
  const { data, error } = await supabase
    .from('task_completions')
    .select('completed_by, points_earned');
  if (error) throw error;

  const completions = data ?? [];
  let mainPoints = 0;
  let partnerPoints = 0;

  for (const c of completions) {
    if (c.completed_by === MAIN_ID) {
      mainPoints += c.points_earned;
    } else {
      partnerPoints += c.points_earned;
    }
  }

  const total = mainPoints + partnerPoints || 1;
  return {
    mainPercentage: Math.round((mainPoints / total) * 100),
    partnerPercentage: Math.round((partnerPoints / total) * 100),
    mainName: 'Main',
    partnerName: 'Partner',
  };
}

export interface WeeklyPulse {
  completedThisWeek: number;
  changeFromLastWeek: number;
}

export async function getWeeklyPulse(): Promise<WeeklyPulse> {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  const { data: thisWeek, error: e1 } = await supabase
    .from('task_completions')
    .select('id')
    .gte('completed_at', startOfWeek.toISOString());
  if (e1) throw e1;

  const { data: lastWeek, error: e2 } = await supabase
    .from('task_completions')
    .select('id')
    .gte('completed_at', startOfLastWeek.toISOString())
    .lt('completed_at', startOfWeek.toISOString());
  if (e2) throw e2;

  return {
    completedThisWeek: thisWeek?.length ?? 0,
    changeFromLastWeek: (thisWeek?.length ?? 0) - (lastWeek?.length ?? 0),
  };
}

export interface PointsBreakdown {
  name: string;
  taskPoints: number;
  kudosPoints: number;
  totalPoints: number;
}

export async function getPointsBreakdown(): Promise<PointsBreakdown[]> {
  const { data: completions, error: e1 } = await supabase
    .from('task_completions')
    .select('completed_by, points_earned');
  if (e1) throw e1;

  const { data: kudosData, error: e2 } = await supabase
    .from('kudos')
    .select('to_profile, points');
  if (e2) throw e2;

  const profiles = [
    { id: MAIN_ID, name: 'Main' },
    { id: PARTNER_ID, name: 'Partner' },
  ];

  return profiles.map((p) => {
    const taskPoints = (completions ?? [])
      .filter((c) => c.completed_by === p.id)
      .reduce((sum, c) => sum + c.points_earned, 0);
    const kudosPoints = (kudosData ?? [])
      .filter((k) => k.to_profile === p.id)
      .reduce((sum, k) => sum + k.points, 0);
    return {
      name: p.name,
      taskPoints,
      kudosPoints,
      totalPoints: taskPoints + kudosPoints,
    };
  });
}
