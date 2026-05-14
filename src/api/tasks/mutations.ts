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
} from '../../supabase/mutations/tasks';
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

  const { mutate, mutateAsync, isPending, isError } = useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(input, scope),
    onSuccess: () => invalidateAll(),
  });

  return {
    createTask: mutate,
    createTaskAsync: mutateAsync,
    isCreating: isPending,
    isError,
  };
};

// ── useCreateTasks (batch) ────────────────────────────────────────────────────

export const useCreateTasks = () => {
  const scope = useAuthScope();
  const { invalidateAll } = useInvalidateTasks();

  const { mutate, mutateAsync, isPending, isError } = useMutation({
    mutationFn: (inputs: CreateTaskInput[]) => createTasks(inputs, scope),
    onSuccess: () => invalidateAll(),
  });

  return {
    createTasks: mutate,
    createTasksAsync: mutateAsync,
    isCreating: isPending,
    isError,
  };
};

// ── useUpdateTask ─────────────────────────────────────────────────────────────

export const useUpdateTask = () => {
  const { householdId } = useAuthScope();
  const { invalidateDetail } = useInvalidateTasks();

  const { mutate, mutateAsync, isPending } = useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: UpdateTaskInput }) =>
      updateTask(taskId, householdId, input),
    onSuccess: (_, { taskId }) => invalidateDetail(taskId),
  });

  return {
    updateTask: mutate,
    updateTaskAsync: mutateAsync,
    isUpdating: isPending,
  };
};

// ── useDeleteTask ─────────────────────────────────────────────────────────────

export const useDeleteTask = () => {
  const { householdId } = useAuthScope();
  const { invalidateAll } = useInvalidateTasks();

  const { mutate, isPending } = useMutation({
    mutationFn: ({ taskId }: { taskId: string }) => deleteTask(taskId, householdId),
    onSuccess: () => invalidateAll(),
  });

  return {
    deleteTask: mutate,
    isDeleting: isPending,
  };
};

// ── useCompleteTask ───────────────────────────────────────────────────────────

export const useCompleteTask = () => {
  const scope = useAuthScope();
  const queryClient = useQueryClient();
  const { invalidateAll } = useInvalidateTasks();

  const { mutate, mutateAsync, isPending } = useMutation({
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

  return {
    completeTask: mutate,
    completeTaskAsync: mutateAsync,
    isCompleting: isPending,
  };
};

// ── useUpdateTaskSeries ───────────────────────────────────────────────────────

export const useUpdateTaskSeries = () => {
  const { householdId } = useAuthScope();
  const { invalidateAll } = useInvalidateTasks();

  const { mutate, mutateAsync, isPending } = useMutation({
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

  return {
    updateTaskSeries: mutate,
    updateTaskSeriesAsync: mutateAsync,
    isUpdating: isPending,
  };
};

// ── useDeleteTaskSeries ───────────────────────────────────────────────────────

export const useDeleteTaskSeries = () => {
  const { invalidateAll } = useInvalidateTasks();

  const { mutate, isPending } = useMutation({
    mutationFn: ({ recurrenceId, fromDate }: { recurrenceId: string; fromDate?: string }) =>
      deleteTaskSeries(recurrenceId, fromDate),
    onSuccess: () => invalidateAll(),
  });

  return {
    deleteTaskSeries: mutate,
    isDeleting: isPending,
  };
};

// ── useDeleteTasksAfter ───────────────────────────────────────────────────────

export const useDeleteTasksAfter = () => {
  const { invalidateAll } = useInvalidateTasks();

  const { mutate, mutateAsync, isPending } = useMutation({
    mutationFn: ({ recurrenceId, date }: { recurrenceId: string; date: string }) =>
      deleteTasksAfter(recurrenceId, date),
    onSuccess: () => invalidateAll(),
  });

  return {
    deleteTasksAfter: mutate,
    deleteTasksAfterAsync: mutateAsync,
    isDeleting: isPending,
  };
};

// ── useUpdateCompletionAssignment ─────────────────────────────────────────────

export const useUpdateCompletionAssignment = () => {
  const scope = useAuthScope();
  const { invalidateDetail } = useInvalidateTasks();

  const { mutate, mutateAsync, isPending } = useMutation({
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

  return {
    updateCompletionAssignment: mutate,
    updateCompletionAssignmentAsync: mutateAsync,
    isUpdating: isPending,
  };
};
