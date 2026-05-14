import { supabase } from '../client';
import { SupabaseError } from '../errors';
import { fetchTaskById } from './queries';
import { fetchProfiles as getProfiles } from '../profiles/queries';
import { EFFORT_POINTS } from '../../constants';
import type { AuthScope } from '../../context/AuthContext';
import type {
  CreateTaskInput,
  UpdateTaskInput,
  AssignmentOverride,
  AssignmentOverrideType,
} from '../../domain/types';

// ── Private helpers ────────────────────────────────────────────────────────────

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
  task: Awaited<ReturnType<typeof fetchTaskById>>,
  scope: AuthScope,
  assignmentOverride?: AssignmentOverride,
): Promise<{
  assignmentType: AssignmentOverrideType | 'strict_rotation';
  assignedTo: string | null;
  recipientIds: string[];
}> {
  if (!task) throw new Error('Task not found');

  if (assignmentOverride?.type === 'team_work') {
    const members = await getProfiles(scope.householdId);
    const recipientIds = members.map((m) => m.id);
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
    const recipientIds = members.map((m) => m.id);
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
    assignmentType: task.assignment_type as AssignmentOverrideType | 'strict_rotation',
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

  if (deleteError) throw new SupabaseError(deleteError);

  const splitCompletions = splitPointsAcrossRecipients(points, recipientIds);
  const completions = splitCompletions.map((completion) => ({
    task_id: taskId,
    household_id: householdId,
    completed_by: completion.completed_by,
    points_earned: completion.points_earned,
  }));

  const { error: insertError } = await supabase.from('task_completions').insert(completions);
  if (insertError) throw new SupabaseError(insertError);
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function createTask(input: CreateTaskInput, scope: AuthScope) {
  const points =
    input.type === 'task' && input.effort_level
      ? EFFORT_POINTS[input.effort_level]
      : (input.points ?? 10);

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...input,
      points,
      household_id: scope.householdId,
      status: 'pending',
      created_by: scope.profileId,
      assigned_to: resolveAssignedToForInsert(input, scope.profileId),
    })
    .select()
    .single();

  if (error) throw new SupabaseError(error);
  return data;
}

export async function createTasks(inputs: CreateTaskInput[], scope: AuthScope) {
  const tasksToInsert = inputs.map((input) => {
    const points =
      input.type === 'task' && input.effort_level
        ? EFFORT_POINTS[input.effort_level]
        : (input.points ?? 10);

    return {
      ...input,
      points,
      household_id: scope.householdId,
      status: 'pending',
      created_by: scope.profileId,
      assigned_to: resolveAssignedToForInsert(input, scope.profileId),
    };
  });

  const { data, error } = await supabase.from('tasks').insert(tasksToInsert).select();

  if (error) throw new SupabaseError(error);
  return data ?? [];
}

export async function updateTask(
  taskId: string,
  householdId: string,
  input: UpdateTaskInput,
) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('household_id', householdId)
    .select()
    .single();

  if (error) throw new SupabaseError(error);
  return data;
}

export async function deleteTask(taskId: string, householdId: string): Promise<void> {
  const { data: completions, error: completionsError } = await supabase
    .from('task_completions')
    .select('id')
    .eq('task_id', taskId)
    .eq('household_id', householdId);

  if (completionsError) throw new SupabaseError(completionsError);

  if (completions && completions.length > 0) {
    const { error } = await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', taskId)
      .eq('household_id', householdId);
    if (error) throw new SupabaseError(error);
  } else {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('household_id', householdId);
    if (error) throw new SupabaseError(error);
  }
}

export async function completeTask(
  taskId: string,
  scope: AuthScope,
  override?: AssignmentOverride,
): Promise<void> {
  const task = await fetchTaskById(scope.householdId, taskId);
  if (!task) throw new Error('Task not found');

  const assignment = await resolveAssignmentRecipients(task, scope, override);

  const { error: updateError } = await supabase
    .from('tasks')
    .update({
      status: 'completed',
      last_done_by: scope.profileId,
      assignment_type: assignment.assignmentType,
      assigned_to: assignment.assignedTo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('household_id', scope.householdId);

  if (updateError) throw new SupabaseError(updateError);
  await replaceTaskCompletions(taskId, scope.householdId, task.points, assignment.recipientIds);
}

export async function updateTaskSeries(
  recurrenceId: string,
  fromDate: string,
  input: UpdateTaskInput,
  householdId: string,
): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('household_id', householdId)
    .eq('recurrence_id', recurrenceId)
    .gte('date', fromDate);

  if (error) throw new SupabaseError(error);
}

export async function deleteTaskSeries(
  recurrenceId: string,
  fromDate?: string,
): Promise<void> {
  const { error } = await supabase.rpc('delete_task_series_rpc', {
    p_recurrence_id: recurrenceId,
    p_from_date: fromDate,
  });
  if (error) throw new SupabaseError(error);
}

export async function deleteTasksAfter(
  recurrenceId: string,
  date: string,
): Promise<void> {
  const { error } = await supabase.rpc('delete_tasks_after_rpc', {
    p_recurrence_id: recurrenceId,
    p_date: date,
  });
  if (error) throw new SupabaseError(error);
}

export async function updateTaskCompletionAssignment(
  taskId: string,
  assignmentType: AssignmentOverrideType,
  assignedTo: string[],
  scope: AuthScope,
): Promise<void> {
  const task = await fetchTaskById(scope.householdId, taskId);
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

  if (updateError) throw new SupabaseError(updateError);
  await replaceTaskCompletions(taskId, scope.householdId, task.points, assignment.recipientIds);
}
