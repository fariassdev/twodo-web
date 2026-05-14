import { useQuery } from '@tanstack/react-query';
import { taskCompletionsQueryOptions } from '../queries/tasks';
import { useAuthScope } from '../../lib/queryHooks';

const useTaskCompletions = (taskId: string | undefined) => {
  const { householdId } = useAuthScope();

  const enabled = Boolean(taskId && householdId);

  const { data, isLoading } = useQuery({
    ...taskCompletionsQueryOptions(taskId!, householdId!),
    enabled,
  });

  return { completions: data ?? [], loading: isLoading };
};

export default useTaskCompletions;
export type UseTaskCompletions = ReturnType<typeof useTaskCompletions>;
