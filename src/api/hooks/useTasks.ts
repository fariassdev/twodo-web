import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { subDays, addDays } from 'date-fns';
import { useCallback } from 'react';
import { fetchTasksInRange, fetchTaskCatalog, fetchTaskCount, fetchTaskById, fetchTaskCompletions } from '../queries/tasks';
import { normalizeTask, type Task } from '../../models/Task';
import { getLocalDateString } from '../../utils';
import { queryKeys } from '../../lib/queryKeys';
import { useAuthScope } from '../../lib/queryHooks'; // Using existing auth scope for now
import type { TaskCatalogItem } from '../../lib/types';

/**
 * Hook to fetch tasks for the dashboard (today, overdue, upcoming).
 */
export const useTasksDashboard = () => {
  const { householdId } = useAuthScope();

  return useQuery<Task[]>({
    queryKey: householdId ? queryKeys.tasks.dashboard(householdId) : ['tasks', 'dashboard', 'disabled'],
    queryFn: async () => {
      const today = new Date();
      const startDate = getLocalDateString(subDays(today, 7));
      const endDate = getLocalDateString(addDays(today, 1));

      const rawTasks = await fetchTasksInRange({
        householdId: householdId!,
        startDate,
        endDate,
      });

      return rawTasks.map(task => normalizeTask(task));
    },
    enabled: Boolean(householdId),
  });
};

/**
 * Hook to fetch the task catalog.
 */
export const useTaskCatalog = () => {
  return useQuery<TaskCatalogItem[]>({
    queryKey: queryKeys.tasks.catalog(),
    queryFn: fetchTaskCatalog,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

/**
 * Hook to fetch total task count.
 */
export const useTaskCount = () => {
  const { householdId } = useAuthScope();

  return useQuery({
    queryKey: householdId ? queryKeys.tasks.count(householdId) : ['tasks', 'count', 'disabled'],
    queryFn: () => fetchTaskCount(householdId as string),
    enabled: Boolean(householdId),
  });
};

/**
 * Hook to fetch a single task by ID.
 */
export const useTaskById = (taskId: string | undefined) => {
  const { householdId } = useAuthScope();

  return useQuery({
    queryKey: taskId && householdId ? queryKeys.tasks.detail(taskId, householdId) : ['tasks', 'detail', 'disabled', taskId ?? 'none'],
    queryFn: async () => {
      const rawTask = await fetchTaskById(taskId as string, householdId as string);
      return rawTask ? normalizeTask(rawTask) : null;
    },
    enabled: Boolean(taskId && householdId),
    initialData: () => {
      if (!taskId || !householdId) return undefined;
      // Try to find in cache (optional enhancement, can be refined)
      return undefined; 
    }
  });
};

/**
 * Hook to fetch task completions.
 */
export const useTaskCompletions = (taskId: string | undefined) => {
  const { householdId } = useAuthScope();

  return useQuery({
    queryKey: taskId && householdId ? queryKeys.taskDetail.completions(taskId, householdId) : ['taskDetail', 'completions', 'disabled', taskId ?? 'none'],
    queryFn: () => fetchTaskCompletions(taskId as string, householdId as string),
    enabled: Boolean(taskId && householdId),
  });
};

/**
 * Hook to fetch tasks for a specific month.
 */
export const useTasksForMonth = (year: number, month: number, includeDeleted: boolean) => {
  const { householdId } = useAuthScope();

  return useQuery({
    queryKey: householdId ? queryKeys.calendar.month(year, month, includeDeleted, householdId) : ['calendar', 'month', 'disabled', year, month, includeDeleted],
    queryFn: async () => {
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const actualEndDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const rawTasks = await fetchTasksInRange({
        householdId: householdId!,
        startDate,
        endDate: actualEndDate,
        includeDeleted,
      });

      return rawTasks.map(task => normalizeTask(task));
    },
    enabled: Boolean(householdId),
    placeholderData: keepPreviousData,
  });
};

/**
 * Hook to prefetch month tasks (useful for calendar navigation).
 */
export const usePrefetchMonthTasks = () => {
  const queryClient = useQueryClient();
  const { householdId } = useAuthScope();

  return useCallback(
    (year: number, month: number, includeDeleted: boolean) => {
      if (!householdId) return Promise.resolve(undefined);

      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const actualEndDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      return queryClient.prefetchQuery({
        queryKey: queryKeys.calendar.month(year, month, includeDeleted, householdId),
        queryFn: async () => {
          const rawTasks = await fetchTasksInRange({
            householdId,
            startDate,
            endDate: actualEndDate,
            includeDeleted,
          });
          return rawTasks.map(task => normalizeTask(task));
        },
      });
    },
    [householdId, queryClient],
  );
};
