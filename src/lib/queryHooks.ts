import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  addShoppingItem,
  completeTask,
  createTask,
  createTasks,
  deleteShoppingItem,
  deleteTask,
  deleteTaskSeries,
  deleteTasksAfter,
  getEquityBalance,
  getLatestLoveNote,
  getLoveNoteForTask,
  getPointsBreakdown,
  getProfileById,
  getProfiles,
  getShoppingItems,
  getTaskById,
  getTasksForMonth,
  getTodaysTasks,
  getUpcomingEvents,
  getWeeklyPulse,
  postponeTask,
  togglePurchased,
  updateProfile,
  updateQuantity,
  updateTask,
  type CreateTaskInput,
  type EquityBalance,
  type PointsBreakdown,
  type UpdateProfileInput,
  type UpdateTaskInput,
  type WeeklyPulse,
} from './queries';
import { queryKeys } from './queryKeys';
import type { LoveNote, Profile, ShoppingItem, Task } from './types';

type InvalidateTaskGraphOptions = {
  taskId?: string;
  scope?: 'single' | 'series';
};

function findTaskInCache(queryClient: QueryClient, taskId: string): Task | undefined {
  const fromToday = queryClient.getQueryData<Task[]>(queryKeys.tasks.today())?.find((task) => task.id === taskId);
  if (fromToday) return fromToday;

  const fromUpcoming = queryClient
    .getQueryData<Task[]>(queryKeys.tasks.upcoming())
    ?.find((task) => task.id === taskId);
  if (fromUpcoming) return fromUpcoming;

  const candidates = queryClient
    .getQueryCache()
    .findAll({
      predicate: (query) => {
        const [domain, area] = query.queryKey;
        return (
          (domain === 'tasks' && area === 'month') ||
          (domain === 'calendar' && area === 'month')
        );
      },
    })
    .map((query) => query.state.data)
    .filter((value): value is Task[] => Array.isArray(value));

  for (const taskList of candidates) {
    const found = taskList.find((task) => task.id === taskId);
    if (found) return found;
  }

  return undefined;
}

async function invalidateTaskGraph(
  queryClient: QueryClient,
  options: InvalidateTaskGraphOptions = {},
) {
  const { taskId, scope = 'single' } = options;

  if (scope === 'series') {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.taskDetail.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.metrics.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.loveNotes.all }),
    ]);

    if (taskId) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.taskDetail.byId(taskId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.loveNotes.byTask(taskId) }),
      ]);
    }

    return;
  }

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.today() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.upcoming() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.metrics.weeklyPulse() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.metrics.equity() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.metrics.pointsBreakdown() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.loveNotes.latest() }),
  ]);

  if (!taskId) {
    return;
  }

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.taskDetail.byId(taskId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.loveNotes.byTask(taskId) }),
  ]);
}

export function useProfilesQuery() {
  return useQuery<Profile[]>({
    queryKey: queryKeys.profiles.list(),
    queryFn: getProfiles,
  });
}

export function useProfileQuery(profileId: string | undefined) {
  return useQuery<Profile | null>({
    queryKey: profileId ? queryKeys.profiles.detail(profileId) : ['profiles', 'detail', 'unknown'],
    queryFn: () => getProfileById(profileId as string),
    enabled: Boolean(profileId),
  });
}

export function useTodaysTasksQuery() {
  return useQuery<Task[]>({
    queryKey: queryKeys.tasks.today(),
    queryFn: getTodaysTasks,
  });
}

export function useUpcomingEventsQuery() {
  return useQuery<Task[]>({
    queryKey: queryKeys.tasks.upcoming(),
    queryFn: getUpcomingEvents,
  });
}

export function useTaskByIdQuery(taskId: string | undefined) {
  const queryClient = useQueryClient();

  return useQuery<Task | null>({
    queryKey: taskId ? queryKeys.tasks.detail(taskId) : ['tasks', 'detail', 'unknown'],
    queryFn: () => getTaskById(taskId as string),
    enabled: Boolean(taskId),
    initialData: taskId ? findTaskInCache(queryClient, taskId) ?? undefined : undefined,
  });
}

export function useTasksForMonthQuery(year: number, month: number, includeDeleted: boolean) {
  return useQuery<Task[]>({
    queryKey: queryKeys.calendar.month(year, month, includeDeleted),
    queryFn: () => getTasksForMonth(year, month, includeDeleted),
    placeholderData: keepPreviousData,
  });
}


export function usePrefetchMonthTasks() {
  const queryClient = useQueryClient();
  return (year: number, month: number, includeDeleted: boolean) =>
    queryClient.prefetchQuery({
      queryKey: queryKeys.calendar.month(year, month, includeDeleted),
      queryFn: () => getTasksForMonth(year, month, includeDeleted),
    });
}

export function useLatestLoveNoteQuery() {
  return useQuery<LoveNote | null>({
    queryKey: queryKeys.loveNotes.latest(),
    queryFn: getLatestLoveNote,
  });
}

export function useLoveNoteForTaskQuery(taskId: string | undefined) {
  return useQuery<LoveNote | null>({
    queryKey: taskId ? queryKeys.loveNotes.byTask(taskId) : ['loveNotes', 'task', 'unknown'],
    queryFn: () => getLoveNoteForTask(taskId as string),
    enabled: Boolean(taskId),
  });
}

export function useWeeklyPulseQuery() {
  return useQuery<WeeklyPulse>({
    queryKey: queryKeys.metrics.weeklyPulse(),
    queryFn: getWeeklyPulse,
  });
}

export function useEquityBalanceQuery(profiles: Profile[] | undefined) {
  return useQuery<EquityBalance>({
    queryKey: [
      ...queryKeys.metrics.equity(),
      ...(profiles?.map((profile) => profile.id) ?? []),
    ],
    queryFn: () => getEquityBalance(profiles),
    enabled: Boolean(profiles),
  });
}

export function usePointsBreakdownQuery(profiles: Profile[] | undefined) {
  return useQuery<PointsBreakdown[]>({
    queryKey: [
      ...queryKeys.metrics.pointsBreakdown(),
      ...(profiles?.map((profile) => profile.id) ?? []),
    ],
    queryFn: () => getPointsBreakdown(profiles),
    enabled: Boolean(profiles),
  });
}

export function useShoppingItemsQuery() {
  return useQuery<ShoppingItem[]>({
    queryKey: queryKeys.shopping.list(),
    queryFn: getShoppingItems,
  });
}

export function useCreateTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(input),
    onSuccess: async (createdTask) => {
      queryClient.setQueryData<Task | null>(queryKeys.tasks.detail(createdTask.id), createdTask);
      await invalidateTaskGraph(queryClient, {
        taskId: createdTask.id,
        scope: 'single',
      });
    },
  });
}

export function useCreateTasksMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inputs: CreateTaskInput[]) => createTasks(inputs),
    onSuccess: async (createdTasks) => {
      for (const task of createdTasks) {
        queryClient.setQueryData<Task | null>(queryKeys.tasks.detail(task.id), task);
      }
      await invalidateTaskGraph(queryClient, {
        taskId: createdTasks[0]?.id,
        scope: createdTasks.length > 1 ? 'series' : 'single',
      });
    },
  });
}

export function useUpdateTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: UpdateTaskInput }) => updateTask(taskId, input),
    onSuccess: async (updatedTask) => {
      queryClient.setQueryData<Task | null>(queryKeys.tasks.detail(updatedTask.id), updatedTask);
      await invalidateTaskGraph(queryClient, {
        taskId: updatedTask.id,
        scope: 'single',
      });
    },
  });
}

export function useDeleteTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: async (_, taskId) => {
      queryClient.removeQueries({ queryKey: queryKeys.tasks.detail(taskId) });
      await invalidateTaskGraph(queryClient, {
        taskId,
        scope: 'single',
      });
    },
  });
}

export function useDeleteTaskSeriesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recurrenceId, fromDate }: { recurrenceId: string; fromDate?: string }) =>
      deleteTaskSeries(recurrenceId, fromDate),
    onSuccess: async () => {
      await invalidateTaskGraph(queryClient, { scope: 'series' });
    },
  });
}

export function useDeleteTasksAfterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recurrenceId, date }: { recurrenceId: string; date: string }) =>
      deleteTasksAfter(recurrenceId, date),
    onSuccess: async () => {
      await invalidateTaskGraph(queryClient, { scope: 'series' });
    },
  });
}

export function useCompleteTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => completeTask(taskId),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.today() });
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(taskId) });

      const previousToday = queryClient.getQueryData<Task[]>(queryKeys.tasks.today());
      const previousDetail = queryClient.getQueryData<Task | null>(queryKeys.tasks.detail(taskId));

      queryClient.setQueryData<Task[]>(queryKeys.tasks.today(), (current) =>
        (current ?? []).filter((task) => task.id !== taskId),
      );

      queryClient.setQueryData<Task | null>(queryKeys.tasks.detail(taskId), (current) =>
        current
          ? {
              ...current,
              status: 'completed',
            }
          : current,
      );

      return { previousToday, previousDetail };
    },
    onError: (_error, taskId, context) => {
      if (context?.previousToday) {
        queryClient.setQueryData(queryKeys.tasks.today(), context.previousToday);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(queryKeys.tasks.detail(taskId), context.previousDetail);
      }
    },
    onSuccess: async (_, taskId) => {
      await invalidateTaskGraph(queryClient, {
        taskId,
        scope: 'single',
      });
    },
  });
}

export function usePostponeTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => postponeTask(taskId),
    onSuccess: async (_, taskId) => {
      await invalidateTaskGraph(queryClient, {
        taskId,
        scope: 'single',
      });
    },
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ profileId, input }: { profileId: string; input: UpdateProfileInput }) =>
      updateProfile(profileId, input),
    onSuccess: async (profile) => {
      queryClient.setQueryData(queryKeys.profiles.detail(profile.id), profile);
      queryClient.setQueryData<Profile[]>(queryKeys.profiles.list(), (current) => {
        if (!current) return [profile];
        if (current.some((item) => item.id === profile.id)) {
          return current.map((item) => (item.id === profile.id ? profile : item));
        }
        return [...current, profile];
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.profiles.list() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.metrics.weeklyPulse() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.metrics.equity() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.metrics.pointsBreakdown() }),
      ]);
    },
  });
}

export function useAddShoppingItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => addShoppingItem(name),
    onSuccess: (item) => {
      queryClient.setQueryData<ShoppingItem[]>(queryKeys.shopping.list(), (current) => [
        item,
        ...(current ?? []).filter((existing) => existing.id !== item.id),
      ]);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.shopping.list() });
    },
  });
}

export function useTogglePurchasedMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, currentValue }: { id: string; currentValue: boolean }) =>
      togglePurchased(id, currentValue),
    onMutate: async ({ id, currentValue }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.shopping.list() });
      const previous = queryClient.getQueryData<ShoppingItem[]>(queryKeys.shopping.list());

      queryClient.setQueryData<ShoppingItem[]>(queryKeys.shopping.list(), (current) =>
        (current ?? []).map((item) =>
          item.id === id ? { ...item, is_purchased: !currentValue } : item,
        ),
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.shopping.list(), context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.shopping.list() });
    },
  });
}

export function useUpdateQuantityMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) => updateQuantity(id, quantity),
    onMutate: async ({ id, quantity }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.shopping.list() });
      const previous = queryClient.getQueryData<ShoppingItem[]>(queryKeys.shopping.list());

      queryClient.setQueryData<ShoppingItem[]>(queryKeys.shopping.list(), (current) =>
        (current ?? []).map((item) => (item.id === id ? { ...item, quantity } : item)),
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.shopping.list(), context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.shopping.list() });
    },
  });
}

export function useDeleteShoppingItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteShoppingItem(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.shopping.list() });
      const previous = queryClient.getQueryData<ShoppingItem[]>(queryKeys.shopping.list());

      queryClient.setQueryData<ShoppingItem[]>(queryKeys.shopping.list(), (current) =>
        (current ?? []).filter((item) => item.id !== id),
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.shopping.list(), context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.shopping.list() });
    },
  });
}
