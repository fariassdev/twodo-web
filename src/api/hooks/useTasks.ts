import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { tasksQueryOptions } from '../queries/tasks';
import { normalizeTask, type Task } from '../../models/Task';
import { useAuthScope } from '../../lib/queryHooks';

export interface UseTasksParams {
  startDate: string;
  endDate: string;
  includeDeleted?: boolean;
}

const useTasks = ({ startDate, endDate, includeDeleted }: UseTasksParams) => {
  const queryClient = useQueryClient();
  const { householdId } = useAuthScope();

  const { data, isLoading } = useQuery({
    ...tasksQueryOptions({ startDate, endDate, householdId: householdId!, includeDeleted }),
    enabled: Boolean(householdId),
    placeholderData: keepPreviousData,
  });

  const tasks = useMemo(
    () => (data ? data.map((task) => normalizeTask(task)) : []),
    [data],
  );

  const prefetch = useCallback(
    (params: UseTasksParams) => {
      if (!householdId) return Promise.resolve(undefined);

      return queryClient.prefetchQuery({
        ...tasksQueryOptions({
          ...params,
          householdId,
        }),
      });
    },
    [householdId, queryClient],
  );

  return { tasks, loading: isLoading, prefetch };
};

export default useTasks;
export type UseTasks = ReturnType<typeof useTasks>;
