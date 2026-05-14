import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import {
  fetchTaskById,
  fetchTasksInRange,
  fetchTaskCatalog,
  fetchTaskCount,
  fetchTaskCompletions,
} from '../supabase/queries/tasks';

export const taskQueryOptions = (id: string, householdId: string) =>
  queryOptions({
    queryKey: queryKeys.tasks.detail(id, householdId),
    queryFn: () => fetchTaskById(id, householdId),
    enabled: Boolean(id && householdId),
  });

export const tasksQueryOptions = (params: {
  startDate: string;
  endDate: string;
  householdId: string;
  includeDeleted?: boolean;
}) =>
  queryOptions({
    queryKey: queryKeys.tasks.range(
      params.startDate,
      params.endDate,
      params.includeDeleted ?? false,
      params.householdId,
    ),
    queryFn: () => fetchTasksInRange(params),
    enabled: Boolean(params.householdId),
  });

export const taskCatalogQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.tasks.catalog(),
    queryFn: fetchTaskCatalog,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

export const taskCountQueryOptions = (householdId: string) =>
  queryOptions({
    queryKey: queryKeys.tasks.count(householdId),
    queryFn: () => fetchTaskCount(householdId),
    enabled: Boolean(householdId),
  });

export const taskCompletionsQueryOptions = (taskId: string, householdId: string) =>
  queryOptions({
    queryKey: queryKeys.taskDetail.completions(taskId, householdId),
    queryFn: () => fetchTaskCompletions(taskId, householdId),
    enabled: Boolean(taskId && householdId),
  });
