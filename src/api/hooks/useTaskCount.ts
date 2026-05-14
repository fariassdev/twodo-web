import { useQuery } from '@tanstack/react-query';
import { taskCountQueryOptions } from '../queries/tasks';
import { useAuthScope } from '../../lib/queryHooks';

const useTaskCount = () => {
  const { householdId } = useAuthScope();

  const { data, isLoading } = useQuery({
    ...taskCountQueryOptions(householdId!),
    enabled: Boolean(householdId),
  });

  return { count: data ?? 0, loading: isLoading };
};

export default useTaskCount;
export type UseTaskCount = ReturnType<typeof useTaskCount>;
