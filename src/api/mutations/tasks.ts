import { supabase } from '../../lib/supabase';
import type { Task as RawTask } from '../../lib/types';
import { EFFORT_POINTS, type EffortLevel } from '../../constants';
import { fetchTaskById, TASK_FULL_QUERY } from '../queries/tasks';
import { getProfiles } from '../../lib/queries'; // Temporary until profiles are refactored

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

export interface UpdateTaskInput extends Partial<CreateTaskInput> {}

export type TaskAssignmentOverrideType = 'team_work' | 'individual' | 'anyone';

export interface TaskAssignmentOverride {
  type: TaskAssignmentOverrideType;
  assignedTo?: string[];
}

interface MutationScope {
  householdId: string;
  profileId: string;
}

// Helpers
function resolveAssignedToForInsert(
  input: Pick<CreateTaskInput, 'assignment_type' | 'assigned_to'>,
  currentProfileId: string,
): string | null {
  if (input.assignment_type === 'team_work' || input.assignment_type === 'anyone') {
    return null;
  }
  return input.assigned_to || currentProfileId;
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
  task: RawTask,
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
    const selectedRecipientId = assignmentOverride.assignedTo?.[0] ?? scope.profileId;
    return {
      assignmentType: 'anyone',
      assignedTo: selectedRecipientId,
      recipientIds: [selectedRecipientId],
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

  if (task.assignment_type === 'anyone') {
    return {
      assignmentType: 'anyone',
      assignedTo: scope.profileId,
      recipientIds: [scope.profileId],
    };
  }

  const assignedId = task.assigned_to ?? scope.profileId;
  return {
    assignmentType: task.assignment_type as TaskAssignmentOverrideType | 'strict_rotation',
    assignedTo: assignedId,
    recipientIds: [assignedId],
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

// Public API
export async function createTask(input: CreateTaskInput, scope: MutationScope): Promise<RawTask> {
  const { householdId, profileId } = scope;

  const points = input.type === 'task' && input.effort_level
    ? EFFORT_POINTS[input.effort_level]
    : (input.points ?? 10);

  const { data: createdTask, error } = await supabase
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
  return createdTask as unknown as RawTask;
}

export async function createTasks(inputs: CreateTaskInput[], scope: MutationScope): Promise<RawTask[]> {
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
  return (data ?? []) as unknown as RawTask[];
}

export async function updateTask(taskId: string, input: UpdateTaskInput, householdId: string): Promise<RawTask> {
  const { data: updatedTask, error } = await supabase
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
  return updatedTask as unknown as RawTask;
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

  const task = await fetchTaskById(taskId, householdId);
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

export async function updateTaskCompletionAssignment(
  taskId: string,
  assignmentType: TaskAssignmentOverrideType,
  assignedTo: string[],
  scope: MutationScope,
): Promise<void> {
  const task = await fetchTaskById(taskId, scope.householdId);
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
