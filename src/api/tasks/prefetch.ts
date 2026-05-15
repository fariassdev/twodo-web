import { addMonths, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useAuthScope } from '../../context/AuthContext';
import { fetchTasksInRange } from '../../supabase/tasks';
import { taskKeys } from './keys';
import { getLocalDateString } from '@/src/utils';

export const useAdjacentMonthsPrefetch = ({
  currentMonth,
  includeDeleted = false,
}: {
  currentMonth: Date;
  includeDeleted?: boolean;
}) => {
  const queryClient = useQueryClient();
  const { householdId } = useAuthScope();

  const monthTime = useMemo(() => currentMonth.getTime(), [currentMonth]);

  useEffect(() => {
    if (!householdId) return;

    const adjacentMonths = [subMonths(currentMonth, 1), addMonths(currentMonth, 1)];

    for (const month of adjacentMonths) {
      const startDate = getLocalDateString(startOfMonth(month));
      const endDate = getLocalDateString(endOfMonth(month));

      void queryClient.prefetchQuery({
        queryKey: taskKeys.range(householdId, startDate, endDate, includeDeleted),
        queryFn: () => fetchTasksInRange(householdId, startDate, endDate, includeDeleted),
        staleTime: 5 * 60 * 1000 // 5 min,
      });
    }
  }, [queryClient, householdId, monthTime, includeDeleted]);
}
