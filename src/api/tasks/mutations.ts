import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthScope } from '../../context/AuthContext';
import {
  completeTask,
  createTask,
  createTasks,
  deleteTask,
  deleteTasksAfter,
  deleteTaskSeries,
  updateTask,
  updateTaskCompletionAssignment,
  updateTaskSeries,
} from '@/src/supabase/tasks';
import type { CreateTaskInput, UpdateTaskInput, AssignmentOverride, AssignmentOverrideType } from '../../domain/types';
import type { Task } from '../../domain/task';
import { taskKeys } from './keys';

// ── Invalidation helper (private to module) ────────────────────────────────────

const useInvalidateTasks = () => {
  const queryClient = useQueryClient();
  const { householdId } = useAuthScope();

  return {
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: taskKeys.all(householdId) }),
    invalidateDetail: (taskId: string) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(householdId, taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.completions(householdId, taskId) });
    },
  };
};

// ── useCreateTask ─────────────────────────────────────────────────────────────

export const useCreateTask = () => {
  const scope = useAuthScope();
  const { invalidateAll } = useInvalidateTasks();

  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(input, scope),
    onSuccess: () => invalidateAll(),
  });
};

// ── useCreateTasks (batch) ────────────────────────────────────────────────────

export const useCreateTasks = () => {
  const scope = useAuthScope();
  const { invalidateAll } = useInvalidateTasks();

  return useMutation({
    mutationFn: (inputs: CreateTaskInput[]) => createTasks(inputs, scope),
    onSuccess: () => invalidateAll(),
  });
};

// ── useUpdateTask ─────────────────────────────────────────────────────────────

export const useUpdateTask = () => {
  const { householdId } = useAuthScope();
  const { invalidateDetail } = useInvalidateTasks();

  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: UpdateTaskInput }) =>
      updateTask(taskId, householdId, input),
    onSuccess: (_, { taskId }) => invalidateDetail(taskId),
  });
};

// ── useDeleteTask ─────────────────────────────────────────────────────────────

export const useDeleteTask = () => {
  const { householdId } = useAuthScope();
  const { invalidateAll } = useInvalidateTasks();

  return useMutation({
    mutationFn: ({ taskId }: { taskId: string }) => deleteTask(taskId, householdId),
    onSuccess: () => invalidateAll(),
  });
};

// ── useCompleteTask ───────────────────────────────────────────────────────────

export const useCompleteTask = () => {
  const scope = useAuthScope();
  const queryClient = useQueryClient();
  const { invalidateAll } = useInvalidateTasks();

  return useMutation({
    mutationFn: ({ taskId, override }: { taskId: string; override?: AssignmentOverride }) =>
      completeTask(taskId, scope, override),

    onMutate: async ({ taskId }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all(scope.householdId) });
      const snapshot = queryClient.getQueriesData({ queryKey: taskKeys.all(scope.householdId) });
      queryClient.setQueriesData(
        { queryKey: taskKeys.all(scope.householdId) },
        (old: unknown) =>
          // taskKeys.all matches range, count, and detail queries.
          // Only range queries return arrays — guard accordingly.
          Array.isArray(old)
            ? old.map((t: Task) => (t.id === taskId ? { ...t, status: 'completed' as const } : t))
            : old,
      );
      return { snapshot };
    },
    onError: (_error, _vars, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => invalidateAll(),
  });
};

// ── useUpdateTaskSeries ───────────────────────────────────────────────────────

export const useUpdateTaskSeries = () => {
  const { householdId } = useAuthScope();
  const { invalidateAll } = useInvalidateTasks();

  return useMutation({
    mutationFn: ({
      recurrenceId,
      fromDate,
      input,
    }: {
      recurrenceId: string;
      fromDate: string;
      input: UpdateTaskInput;
    }) => updateTaskSeries(recurrenceId, fromDate, input, householdId),
    onSuccess: () => invalidateAll(),
  });
};

// ── useDeleteTaskSeries ───────────────────────────────────────────────────────

export const useDeleteTaskSeries = () => {
  const { invalidateAll } = useInvalidateTasks();

  return useMutation({
    mutationFn: ({ seriesId, fromDate }: { seriesId: string; fromDate?: string }) =>
      deleteTaskSeries(seriesId, fromDate),
    onSuccess: () => invalidateAll(),
  });
};

// ── useDeleteTasksAfter ───────────────────────────────────────────────────────

export const useDeleteTasksAfter = () => {
  const { invalidateAll } = useInvalidateTasks();

  return useMutation({
    mutationFn: ({ seriesId, date }: { seriesId: string; date: string }) =>
      deleteTasksAfter(seriesId, date),
    onSuccess: () => invalidateAll(),
  });
};

// ── useUpdateCompletionAssignment ─────────────────────────────────────────────

export const useUpdateCompletionAssignment = () => {
  const scope = useAuthScope();
  const { invalidateDetail } = useInvalidateTasks();

  return useMutation({
    mutationFn: ({
      taskId,
      assignmentType,
      assignedTo,
    }: {
      taskId: string;
      assignmentType: AssignmentOverrideType;
      assignedTo: string[];
    }) => updateTaskCompletionAssignment(taskId, assignmentType, assignedTo, scope),
    onSuccess: (_, { taskId }) => invalidateDetail(taskId),
  });
};
