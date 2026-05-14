import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { taskQueryOptions } from '../queries/tasks';
import { normalizeTask } from '../../models/Task';
import { useAuthScope } from '../../lib/queryHooks';

const useTask = ({ id }: { id: string | undefined }) => {
  const { householdId } = useAuthScope();

  const enabled = Boolean(id && householdId);

  const { data, isLoading } = useQuery({
    ...taskQueryOptions(id!, householdId!),
    enabled,
  });

  const task = useMemo(
    () => (data ? normalizeTask(data) : undefined),
    [data],
  );

  return { task, loading: isLoading };
};

export default useTask;
export type UseTask = ReturnType<typeof useTask>;
