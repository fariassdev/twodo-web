import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import * as api from '../mutations/tasks';
import { normalizeTask, type Task } from '../../models/Task';
import { queryKeys } from '../../lib/queryKeys';
import { useAuthScope } from '../../lib/queryHooks';

/**
 * Hook to perform task-related actions (mutations).
 */
export const useTaskActions = () => {
  const queryClient = useQueryClient();
  const { householdId, profileId } = useAuthScope();

  const scope = householdId && profileId ? { householdId, profileId } : null;

  // Invalidation helper
  const invalidateTasks = useCallback(async (taskId?: string, date?: string | null) => {
    if (!householdId) return;

    // Basic invalidations for any task change
    await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.dashboard(householdId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.count(householdId) });

    if (taskId) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId, householdId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.taskDetail.completions(taskId, householdId) });
    }

    // If we have a date, invalidate that month's calendar
    if (date) {
      const parsedDate = new Date(`${date}T00:00:00`);
      const year = parsedDate.getFullYear();
      const month = parsedDate.getMonth();
      
      await queryClient.invalidateQueries({
        queryKey: queryKeys.calendar.month(year, month, false, householdId)
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.calendar.month(year, month, true, householdId)
      });
    } else {
      // If no date, invalidate all calendar/task lists to be safe (or handle series)
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all });
    }
    
    // Invalidate metrics as they might have changed
    await queryClient.invalidateQueries({ queryKey: queryKeys.metrics.all });
  }, [householdId, queryClient]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (input: api.CreateTaskInput) => {
      if (!scope) throw new Error('Auth scope not ready');
      const rawTask = await api.createTask(input, scope);
      return normalizeTask(rawTask);
    },
    onSuccess: (data) => invalidateTasks(data.id, data.date),
  });

  const createTasksMutation = useMutation({
    mutationFn: async (inputs: api.CreateTaskInput[]) => {
      if (!scope) throw new Error('Auth scope not ready');
      const rawTasks = await api.createTasks(inputs, scope);
      return rawTasks.map(task => normalizeTask(task));
    },
    onSuccess: (data) => {
      const firstTask = data[0];
      invalidateTasks(firstTask?.id, firstTask?.date);
    },
  });

  const deleteTasksAfterMutation = useMutation({
    mutationFn: ({ recurrenceId, date }: { recurrenceId: string; date: string }) => {
      return api.deleteTasksAfter(recurrenceId, date);
    },
    onSuccess: () => invalidateTasks(),
  });

  const updateCompletionAssignmentMutation = useMutation({
    mutationFn: ({ taskId, assignmentType, assignedTo }: { taskId: string; assignmentType: api.TaskAssignmentOverrideType; assignedTo: string[] }) => {
      if (!scope) throw new Error('Auth scope not ready');
      return api.updateTaskCompletionAssignment(taskId, assignmentType, assignedTo, scope);
    },
    onSuccess: (_, { taskId }) => invalidateTasks(taskId),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ taskId, input }: { taskId: string; input: api.UpdateTaskInput }) => {
      if (!householdId) throw new Error('Household ID not ready');
      const rawTask = await api.updateTask(taskId, input, householdId);
      return normalizeTask(rawTask);
    },
    onSuccess: (data) => invalidateTasks(data.id, data.date),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ taskId }: { taskId: string }) => {
      if (!householdId) throw new Error('Household ID not ready');
      return api.deleteTask(taskId, householdId);
    },
    onSuccess: (_, { taskId }) => invalidateTasks(taskId),
  });

  const completeMutation = useMutation({
    mutationFn: ({ taskId, override }: { taskId: string; override?: api.TaskAssignmentOverride }) => {
      if (!scope) throw new Error('Auth scope not ready');
      return api.completeTask(taskId, scope, override);
    },
    onSuccess: (_, { taskId }) => invalidateTasks(taskId),
  });

  const updateSeriesMutation = useMutation({
    mutationFn: ({ recurrenceId, fromDate, input }: { recurrenceId: string; fromDate: string; input: api.UpdateTaskInput }) => {
      if (!householdId) throw new Error('Household ID not ready');
      return api.updateTaskSeries(recurrenceId, fromDate, input, householdId);
    },
    onSuccess: () => invalidateTasks(),
  });

  const deleteSeriesMutation = useMutation({
    mutationFn: ({ recurrenceId, fromDate }: { recurrenceId: string; fromDate?: string }) => {
      return api.deleteTaskSeries(recurrenceId, fromDate);
    },
    onSuccess: () => invalidateTasks(),
  });

  // Expose memoized actions
  const createTask = useCallback((input: api.CreateTaskInput) => createMutation.mutateAsync(input), [createMutation]);
  const createTasks = useCallback((inputs: api.CreateTaskInput[]) => createTasksMutation.mutateAsync(inputs), [createTasksMutation]);
  const deleteTasksAfter = useCallback((recurrenceId: string, date: string) => deleteTasksAfterMutation.mutateAsync({ recurrenceId, date }), [deleteTasksAfterMutation]);
  const updateTaskCompletionAssignment = useCallback((taskId: string, assignmentType: api.TaskAssignmentOverrideType, assignedTo: string[]) => updateCompletionAssignmentMutation.mutateAsync({ taskId, assignmentType, assignedTo }), [updateCompletionAssignmentMutation]);
  const updateTask = useCallback((taskId: string, input: api.UpdateTaskInput) => updateMutation.mutateAsync({ taskId, input }), [updateMutation]);
  const deleteTask = useCallback((taskId: string) => deleteMutation.mutateAsync({ taskId }), [deleteMutation]);
  const completeTask = useCallback((taskId: string, override?: api.TaskAssignmentOverride) => completeMutation.mutateAsync({ taskId, override }), [completeMutation]);
  const updateTaskSeries = useCallback((recurrenceId: string, fromDate: string, input: api.UpdateTaskInput) => updateSeriesMutation.mutateAsync({ recurrenceId, fromDate, input }), [updateSeriesMutation]);
  const deleteTaskSeries = useCallback((recurrenceId: string, fromDate?: string) => deleteSeriesMutation.mutateAsync({ recurrenceId, fromDate }), [deleteSeriesMutation]);

  return {
    createTask,
    createTasks,
    deleteTasksAfter,
    updateTaskCompletionAssignment,
    updateTask,
    deleteTask,
    completeTask,
    updateTaskSeries,
    deleteTaskSeries,
    isLoading: createMutation.isPending || createTasksMutation.isPending || updateMutation.isPending || deleteMutation.isPending || completeMutation.isPending || updateSeriesMutation.isPending || deleteSeriesMutation.isPending || deleteTasksAfterMutation.isPending || updateCompletionAssignmentMutation.isPending,
  };
};
