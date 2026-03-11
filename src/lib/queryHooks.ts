import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  addShoppingItem,
  completeTask,
  createTask,
  createTasks,
  deleteShoppingItem,
  deleteTask,
  deleteTaskSeries,
  deleteTasksAfter,
  getAuthContext,
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
  createHouseholdAndInvite,
  getOrCreateHouseholdInvite,
  acceptHouseholdInvite,
  getInviteInfo,
  sendEmailInvite,
  type CreateTaskInput,
  type EquityBalance,
  type PointsBreakdown,
  type UpdateProfileInput,
  type UpdateTaskInput,
  type WeeklyPulse,
} from './queries';
import { queryKeys } from './queryKeys';
import {
  onAuthStateChange,
  resetPasswordForEmail,
  resendConfirmationEmail,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  supabase,
  updatePassword,
} from './supabase';
import type { AuthContext, LoveNote, Profile, ShoppingItem, Task, InviteInfo } from './types';

type AuthCredentials = {
  email: string;
  password: string;
};

type LinkedScope = {
  householdId: string;
  profileId: string;
};

type TaskMutationType = 'complete' | 'postpone' | 'single' | 'series';

const signedOutContext: AuthContext = {
  status: 'signed_out',
  session: null,
  profile: null,
  household: null,
  role: null,
};

function disabledKey(...segments: string[]) {
  return ['disabled', ...segments] as const;
}

function isAuthContextKey(queryKey: QueryKey): boolean {
  return Array.isArray(queryKey) && queryKey[0] === 'auth' && queryKey[1] === 'context';
}

function getAuthContextFromCache(queryClient: QueryClient): AuthContext {
  return queryClient.getQueryData<AuthContext>(queryKeys.auth.context()) ?? signedOutContext;
}

function getLinkedScopeOrThrow(queryClient: QueryClient): LinkedScope {
  const context = getAuthContextFromCache(queryClient);

  if (context.status !== 'linked' || !context.household?.id || !context.profile?.id) {
    throw new Error('AUTH_CONTEXT_NOT_READY');
  }

  return {
    householdId: context.household.id,
    profileId: context.profile.id,
  };
}

function clearPrivateDomainQueries(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: queryKeys.profiles.all });
  queryClient.removeQueries({ queryKey: queryKeys.tasks.all });
  queryClient.removeQueries({ queryKey: queryKeys.calendar.all });
  queryClient.removeQueries({ queryKey: queryKeys.taskDetail.all });
  queryClient.removeQueries({ queryKey: queryKeys.metrics.all });
  queryClient.removeQueries({ queryKey: queryKeys.shopping.all });
  queryClient.removeQueries({ queryKey: queryKeys.loveNotes.all });
}

function isDomainForHousehold(queryKey: QueryKey, domain: string, householdId: string): boolean {
  return Array.isArray(queryKey) && queryKey[0] === domain && queryKey.some((part) => part === householdId);
}

function toYearMonth(date: string | null | undefined): { year: number; month: number } | null {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    year: parsed.getFullYear(),
    month: parsed.getMonth(),
  };
}

async function invalidateMonthBuckets(
  queryClient: QueryClient,
  householdId: string,
  date: string | null | undefined,
) {
  const bucket = toYearMonth(date);
  if (!bucket) return;

  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.tasks.month(bucket.year, bucket.month, false, householdId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.tasks.month(bucket.year, bucket.month, true, householdId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.calendar.month(bucket.year, bucket.month, false, householdId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.calendar.month(bucket.year, bucket.month, true, householdId),
    }),
  ]);
}

async function invalidateTaskMutationGraph(
  queryClient: QueryClient,
  params: {
    householdId: string;
    type: TaskMutationType;
    taskId?: string;
    taskDate?: string | null;
  },
) {
  const { householdId, type, taskId, taskDate } = params;

  if (type === 'series') {
    await Promise.all([
      queryClient.invalidateQueries({
        predicate: (query) => isDomainForHousehold(query.queryKey, 'tasks', householdId),
      }),
      queryClient.invalidateQueries({
        predicate: (query) => isDomainForHousehold(query.queryKey, 'calendar', householdId),
      }),
      queryClient.invalidateQueries({
        predicate: (query) => isDomainForHousehold(query.queryKey, 'taskDetail', householdId),
      }),
      queryClient.invalidateQueries({
        predicate: (query) => isDomainForHousehold(query.queryKey, 'loveNotes', householdId),
      }),
      queryClient.invalidateQueries({
        predicate: (query) => isDomainForHousehold(query.queryKey, 'metrics', householdId),
      }),
    ]);

    if (taskId) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId, householdId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.taskDetail.byId(taskId, householdId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.loveNotes.byTask(taskId, householdId) }),
      ]);
    }

    return;
  }

  if (type === 'single') {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.today(householdId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.upcoming(householdId) }),
    ]);
  }

  if (type === 'complete' || type === 'postpone') {
    await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.today(householdId) });
  }

  if (taskId) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId, householdId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.taskDetail.byId(taskId, householdId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.loveNotes.byTask(taskId, householdId) }),
    ]);
  }

  await invalidateMonthBuckets(queryClient, householdId, taskDate);

  if (type === 'complete') {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.metrics.weeklyPulse(householdId),
        refetchType: 'inactive',
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.metrics.equity(householdId),
        refetchType: 'inactive',
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.metrics.pointsBreakdown(householdId),
        refetchType: 'inactive',
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.loveNotes.latest(householdId),
        refetchType: 'inactive',
      }),
    ]);
  }
}

function findTaskInCache(queryClient: QueryClient, householdId: string, taskId: string): Task | undefined {
  const fromToday = queryClient
    .getQueryData<Task[]>(queryKeys.tasks.today(householdId))
    ?.find((task) => task.id === taskId);
  if (fromToday) return fromToday;

  const fromUpcoming = queryClient
    .getQueryData<Task[]>(queryKeys.tasks.upcoming(householdId))
    ?.find((task) => task.id === taskId);
  if (fromUpcoming) return fromUpcoming;

  const candidates = queryClient
    .getQueryCache()
    .findAll({
      predicate: (query) => {
        const queryKey = query.queryKey;
        if (!Array.isArray(queryKey)) return false;

        const isTaskMonthForHousehold =
          queryKey[0] === 'tasks' && queryKey[1] === 'month' && queryKey[5] === householdId;

        const isCalendarMonthForHousehold =
          queryKey[0] === 'calendar' && queryKey[1] === 'month' && queryKey[5] === householdId;

        return isTaskMonthForHousehold || isCalendarMonthForHousehold;
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

function sortShoppingItems(items: ShoppingItem[]): ShoppingItem[] {
  return [...items].sort((a, b) => {
    if (a.is_purchased !== b.is_purchased) {
      return Number(a.is_purchased) - Number(b.is_purchased);
    }

    const aCreatedAt = Date.parse(a.created_at);
    const bCreatedAt = Date.parse(b.created_at);

    if (!Number.isNaN(aCreatedAt) && !Number.isNaN(bCreatedAt)) {
      return bCreatedAt - aCreatedAt;
    }

    return b.created_at.localeCompare(a.created_at);
  });
}

function reconcileShoppingItemsFromRealtime(
  current: ShoppingItem[] | undefined,
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
): ShoppingItem[] {
  const existing = current ?? [];

  if (payload.eventType === 'INSERT') {
    const insertedItem = payload.new as ShoppingItem;
    if (!insertedItem?.id || existing.some((item) => item.id === insertedItem.id)) {
      return sortShoppingItems(existing);
    }

    return sortShoppingItems([insertedItem, ...existing]);
  }

  if (payload.eventType === 'UPDATE') {
    const updatedItem = payload.new as ShoppingItem;
    if (!updatedItem?.id) {
      return sortShoppingItems(existing);
    }

    const alreadyInCache = existing.some((item) => item.id === updatedItem.id);

    if (!alreadyInCache) {
      return sortShoppingItems([...existing, updatedItem]);
    }

    return sortShoppingItems(
      existing.map((item) => (item.id === updatedItem.id ? { ...item, ...updatedItem } : item)),
    );
  }

  if (payload.eventType === 'DELETE') {
    const deletedId = (payload.old as Partial<ShoppingItem>)?.id;
    if (!deletedId) {
      return sortShoppingItems(existing);
    }

    return sortShoppingItems(existing.filter((item) => item.id !== deletedId));
  }

  return sortShoppingItems(existing);
}

export function useAuthContextSnapshot(): AuthContext {
  const queryClient = useQueryClient();

  return useSyncExternalStore(
    (onStoreChange) =>
      queryClient.getQueryCache().subscribe((event) => {
        if (event?.query && isAuthContextKey(event.query.queryKey)) {
          onStoreChange();
        }
      }),
    () => getAuthContextFromCache(queryClient),
    () => signedOutContext,
  );
}

export function useAuthScope() {
  const context = useAuthContextSnapshot();

  return {
    status: context.status,
    householdId: context.household?.id ?? null,
    profileId: context.profile?.id ?? null,
    profile: context.profile,
  };
}

export function useCurrentHouseholdId(): string | null {
  return useAuthScope().householdId;
}

export function useCurrentProfileId(): string | null {
  return useAuthScope().profileId;
}

export function useAuthContextQuery() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = onAuthStateChange(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.context() });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return useQuery<AuthContext>({
    queryKey: queryKeys.auth.context(),
    queryFn: getAuthContext,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
  });
}

export function useSignInMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: AuthCredentials) => signInWithPassword(email, password),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.context() });
    },
  });
}

export function useSignUpMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: AuthCredentials) => signUpWithPassword(email, password),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.context() });
    },
  });
}

export function useSignOutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => signOut(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.auth.context() });
      queryClient.setQueryData<AuthContext>(queryKeys.auth.context(), signedOutContext);
      clearPrivateDomainQueries(queryClient);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.context() });
    },
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: ({ email }: { email: string }) =>
      resetPasswordForEmail(email, `${window.location.origin}/auth/reset-password`),
  });
}

export function useUpdatePasswordMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ password }: { password: string }) => updatePassword(password),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.context() });
    },
  });
}

export function useResendVerificationMutation() {
  return useMutation({
    mutationFn: ({ email }: { email: string }) => resendConfirmationEmail(email),
  });
}

export function useProfilesQuery() {
  const householdId = useCurrentHouseholdId();

  return useQuery<Profile[]>({
    queryKey: householdId ? queryKeys.profiles.list(householdId) : disabledKey('profiles', 'list'),
    queryFn: () => getProfiles(householdId as string),
    enabled: Boolean(householdId),
  });
}

export function useProfileQuery(profileId: string | undefined) {
  const householdId = useCurrentHouseholdId();

  return useQuery<Profile | null>({
    queryKey:
      profileId && householdId
        ? queryKeys.profiles.detail(profileId, householdId)
        : ['profiles', 'detail', 'disabled', profileId ?? 'none'],
    queryFn: () => getProfileById(profileId as string, householdId as string),
    enabled: Boolean(profileId && householdId),
  });
}

export function useTodaysTasksQuery() {
  const householdId = useCurrentHouseholdId();

  return useQuery<Task[]>({
    queryKey: householdId ? queryKeys.tasks.today(householdId) : disabledKey('tasks', 'today'),
    queryFn: () => getTodaysTasks(householdId as string),
    enabled: Boolean(householdId),
  });
}

export function useUpcomingEventsQuery() {
  const householdId = useCurrentHouseholdId();

  return useQuery<Task[]>({
    queryKey: householdId ? queryKeys.tasks.upcoming(householdId) : disabledKey('tasks', 'upcoming'),
    queryFn: () => getUpcomingEvents(householdId as string),
    enabled: Boolean(householdId),
  });
}

export function useTaskByIdQuery(taskId: string | undefined) {
  const queryClient = useQueryClient();
  const householdId = useCurrentHouseholdId();

  return useQuery<Task | null>({
    queryKey:
      taskId && householdId
        ? queryKeys.tasks.detail(taskId, householdId)
        : ['tasks', 'detail', 'disabled', taskId ?? 'none'],
    queryFn: () => getTaskById(taskId as string, householdId as string),
    enabled: Boolean(taskId && householdId),
    initialData:
      taskId && householdId
        ? findTaskInCache(queryClient, householdId, taskId) ?? undefined
        : undefined,
  });
}

export function useTasksForMonthQuery(year: number, month: number, includeDeleted: boolean) {
  const householdId = useCurrentHouseholdId();

  return useQuery<Task[]>({
    queryKey:
      householdId
        ? queryKeys.calendar.month(year, month, includeDeleted, householdId)
        : ['calendar', 'month', 'disabled', year, month, includeDeleted],
    queryFn: () => getTasksForMonth(year, month, includeDeleted, householdId as string),
    enabled: Boolean(householdId),
    placeholderData: keepPreviousData,
  });
}

export function usePrefetchMonthTasks() {
  const queryClient = useQueryClient();
  const householdId = useCurrentHouseholdId();

  return useCallback(
    (year: number, month: number, includeDeleted: boolean) => {
      if (!householdId) return Promise.resolve(undefined);

      return queryClient.prefetchQuery({
        queryKey: queryKeys.calendar.month(year, month, includeDeleted, householdId),
        queryFn: () => getTasksForMonth(year, month, includeDeleted, householdId),
      });
    },
    [householdId, queryClient],
  );
}

export function useLatestLoveNoteQuery() {
  const householdId = useCurrentHouseholdId();

  return useQuery<LoveNote | null>({
    queryKey: householdId ? queryKeys.loveNotes.latest(householdId) : disabledKey('loveNotes', 'latest'),
    queryFn: () => getLatestLoveNote(householdId as string),
    enabled: Boolean(householdId),
  });
}

export function useLoveNoteForTaskQuery(taskId: string | undefined) {
  const householdId = useCurrentHouseholdId();

  return useQuery<LoveNote | null>({
    queryKey:
      taskId && householdId
        ? queryKeys.loveNotes.byTask(taskId, householdId)
        : ['loveNotes', 'task', 'disabled', taskId ?? 'none'],
    queryFn: () => getLoveNoteForTask(taskId as string, householdId as string),
    enabled: Boolean(taskId && householdId),
  });
}

export function useWeeklyPulseQuery() {
  const householdId = useCurrentHouseholdId();

  return useQuery<WeeklyPulse>({
    queryKey: householdId ? queryKeys.metrics.weeklyPulse(householdId) : disabledKey('metrics', 'weeklyPulse'),
    queryFn: () => getWeeklyPulse(householdId as string),
    enabled: Boolean(householdId),
  });
}

export function useEquityBalanceQuery(profiles: Profile[] | undefined) {
  const householdId = useCurrentHouseholdId();

  const sortedProfiles = useMemo(
    () => (profiles ? [...profiles].sort((a, b) => a.id.localeCompare(b.id)) : undefined),
    [profiles],
  );

  const profileIds = useMemo(() => sortedProfiles?.map((profile) => profile.id) ?? [], [sortedProfiles]);

  return useQuery<EquityBalance>({
    queryKey: householdId
      ? [...queryKeys.metrics.equity(householdId), ...profileIds]
      : ['metrics', 'equity', 'disabled'],
    queryFn: () => getEquityBalance(householdId as string, sortedProfiles),
    enabled: Boolean(householdId),
  });
}

export function usePointsBreakdownQuery(profiles: Profile[] | undefined) {
  const householdId = useCurrentHouseholdId();

  const sortedProfiles = useMemo(
    () => (profiles ? [...profiles].sort((a, b) => a.id.localeCompare(b.id)) : undefined),
    [profiles],
  );

  const profileIds = useMemo(() => sortedProfiles?.map((profile) => profile.id) ?? [], [sortedProfiles]);

  return useQuery<PointsBreakdown[]>({
    queryKey: householdId
      ? [...queryKeys.metrics.pointsBreakdown(householdId), ...profileIds]
      : ['metrics', 'pointsBreakdown', 'disabled'],
    queryFn: () => getPointsBreakdown(householdId as string, sortedProfiles),
    enabled: Boolean(householdId),
  });
}

export function useShoppingItemsQuery() {
  const queryClient = useQueryClient();
  const householdId = useCurrentHouseholdId();

  useEffect(() => {
    if (!householdId) return;

    let hasReceivedSubscribed = false;

    const shoppingChannel = supabase
      .channel(`shopping-items:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_items',
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => {
          queryClient.setQueryData<ShoppingItem[]>(
            queryKeys.shopping.list(householdId),
            (current) => reconcileShoppingItemsFromRealtime(current, payload),
          );
        },
      );

    shoppingChannel.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return;

      if (hasReceivedSubscribed) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.shopping.list(householdId) });
      }

      hasReceivedSubscribed = true;
    });

    return () => {
      void supabase.removeChannel(shoppingChannel);
    };
  }, [householdId, queryClient]);

  return useQuery<ShoppingItem[]>({
    queryKey: householdId ? queryKeys.shopping.list(householdId) : disabledKey('shopping', 'list'),
    queryFn: () => getShoppingItems(householdId as string),
    enabled: Boolean(householdId),
  });
}

export function useCreateTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(input, getLinkedScopeOrThrow(queryClient)),
    onSuccess: async (createdTask) => {
      const householdId = createdTask.household_id;
      queryClient.setQueryData<Task | null>(queryKeys.tasks.detail(createdTask.id, householdId), createdTask);
      queryClient.setQueryData<Task | null>(queryKeys.taskDetail.byId(createdTask.id, householdId), createdTask);

      await invalidateTaskMutationGraph(queryClient, {
        householdId,
        type: 'single',
        taskId: createdTask.id,
        taskDate: createdTask.date,
      });
    },
  });
}

export function useCreateTasksMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inputs: CreateTaskInput[]) => createTasks(inputs, getLinkedScopeOrThrow(queryClient)),
    onSuccess: async (createdTasks) => {
      const householdId = createdTasks[0]?.household_id;
      if (!householdId) return;

      for (const task of createdTasks) {
        queryClient.setQueryData<Task | null>(queryKeys.tasks.detail(task.id, householdId), task);
        queryClient.setQueryData<Task | null>(queryKeys.taskDetail.byId(task.id, householdId), task);
      }

      await invalidateTaskMutationGraph(queryClient, {
        householdId,
        type: createdTasks.length > 1 ? 'series' : 'single',
        taskId: createdTasks[0]?.id,
        taskDate: createdTasks[0]?.date,
      });
    },
  });
}

export function useUpdateTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: UpdateTaskInput }) => {
      const { householdId } = getLinkedScopeOrThrow(queryClient);
      return updateTask(taskId, input, householdId);
    },
    onMutate: ({ taskId }) => {
      const { householdId } = getLinkedScopeOrThrow(queryClient);
      const previousTask = findTaskInCache(queryClient, householdId, taskId);
      return {
        householdId,
        previousTaskDate: previousTask?.date ?? null,
      };
    },
    onSuccess: async (updatedTask, _variables, context) => {
      const householdId = updatedTask.household_id;
      queryClient.setQueryData<Task | null>(queryKeys.tasks.detail(updatedTask.id, householdId), updatedTask);
      queryClient.setQueryData<Task | null>(queryKeys.taskDetail.byId(updatedTask.id, householdId), updatedTask);

      await invalidateTaskMutationGraph(queryClient, {
        householdId,
        type: 'single',
        taskId: updatedTask.id,
        taskDate: updatedTask.date,
      });

      if (context?.previousTaskDate && context.previousTaskDate !== updatedTask.date) {
        await invalidateMonthBuckets(queryClient, householdId, context.previousTaskDate);
      }
    },
  });
}

export function useDeleteTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => {
      const { householdId } = getLinkedScopeOrThrow(queryClient);
      return deleteTask(taskId, householdId);
    },
    onMutate: async (taskId) => {
      const { householdId } = getLinkedScopeOrThrow(queryClient);

      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.today(householdId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.upcoming(householdId) });

      const previousToday = queryClient.getQueryData<Task[]>(queryKeys.tasks.today(householdId));
      const previousUpcoming = queryClient.getQueryData<Task[]>(queryKeys.tasks.upcoming(householdId));
      const previousDetail = queryClient.getQueryData<Task | null>(queryKeys.tasks.detail(taskId, householdId));
      const previousTaskDetail = queryClient.getQueryData<Task | null>(
        queryKeys.taskDetail.byId(taskId, householdId),
      );

      const cachedTask = previousDetail ?? previousTaskDetail ?? findTaskInCache(queryClient, householdId, taskId);

      queryClient.setQueryData<Task[]>(queryKeys.tasks.today(householdId), (current) =>
        (current ?? []).filter((task) => task.id !== taskId),
      );

      queryClient.setQueryData<Task[]>(queryKeys.tasks.upcoming(householdId), (current) =>
        (current ?? []).filter((task) => task.id !== taskId),
      );

      queryClient.removeQueries({ queryKey: queryKeys.tasks.detail(taskId, householdId) });
      queryClient.removeQueries({ queryKey: queryKeys.taskDetail.byId(taskId, householdId) });

      return {
        householdId,
        taskDate: cachedTask?.date ?? null,
        previousToday,
        previousUpcoming,
        previousDetail,
        previousTaskDetail,
      };
    },
    onError: (_error, taskId, context) => {
      if (!context) return;

      queryClient.setQueryData(queryKeys.tasks.today(context.householdId), context.previousToday);
      queryClient.setQueryData(queryKeys.tasks.upcoming(context.householdId), context.previousUpcoming);
      queryClient.setQueryData(
        queryKeys.tasks.detail(taskId, context.householdId),
        context.previousDetail,
      );
      queryClient.setQueryData(
        queryKeys.taskDetail.byId(taskId, context.householdId),
        context.previousTaskDetail,
      );
    },
    onSuccess: async (_data, taskId, context) => {
      if (!context) return;

      await invalidateTaskMutationGraph(queryClient, {
        householdId: context.householdId,
        type: 'single',
        taskId,
        taskDate: context.taskDate,
      });
    },
  });
}

export function useDeleteTaskSeriesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recurrenceId, fromDate }: { recurrenceId: string; fromDate?: string }) =>
      deleteTaskSeries(recurrenceId, fromDate),
    onMutate: () => {
      const { householdId } = getLinkedScopeOrThrow(queryClient);
      return { householdId };
    },
    onSuccess: async (_data, _variables, context) => {
      if (!context) return;
      await invalidateTaskMutationGraph(queryClient, {
        householdId: context.householdId,
        type: 'series',
      });
    },
  });
}

export function useDeleteTasksAfterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recurrenceId, date }: { recurrenceId: string; date: string }) =>
      deleteTasksAfter(recurrenceId, date),
    onMutate: () => {
      const { householdId } = getLinkedScopeOrThrow(queryClient);
      return { householdId };
    },
    onSuccess: async (_data, _variables, context) => {
      if (!context) return;
      await invalidateTaskMutationGraph(queryClient, {
        householdId: context.householdId,
        type: 'series',
      });
    },
  });
}

export function useCompleteTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => completeTask(taskId, getLinkedScopeOrThrow(queryClient)),
    onMutate: async (taskId) => {
      const { householdId } = getLinkedScopeOrThrow(queryClient);

      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.today(householdId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(taskId, householdId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.taskDetail.byId(taskId, householdId) });

      const previousToday = queryClient.getQueryData<Task[]>(queryKeys.tasks.today(householdId));
      const previousDetail = queryClient.getQueryData<Task | null>(queryKeys.tasks.detail(taskId, householdId));
      const previousTaskDetail = queryClient.getQueryData<Task | null>(
        queryKeys.taskDetail.byId(taskId, householdId),
      );

      const taskDate =
        previousDetail?.date ??
        previousTaskDetail?.date ??
        findTaskInCache(queryClient, householdId, taskId)?.date ??
        null;

      queryClient.setQueryData<Task[]>(queryKeys.tasks.today(householdId), (current) =>
        (current ?? []).filter((task) => task.id !== taskId),
      );

      queryClient.setQueryData<Task | null>(queryKeys.tasks.detail(taskId, householdId), (current) =>
        current
          ? {
              ...current,
              status: 'completed',
            }
          : current,
      );

      queryClient.setQueryData<Task | null>(queryKeys.taskDetail.byId(taskId, householdId), (current) =>
        current
          ? {
              ...current,
              status: 'completed',
            }
          : current,
      );

      return { householdId, taskDate, previousToday, previousDetail, previousTaskDetail };
    },
    onError: (_error, taskId, context) => {
      if (!context) return;

      queryClient.setQueryData(queryKeys.tasks.today(context.householdId), context.previousToday);
      queryClient.setQueryData(
        queryKeys.tasks.detail(taskId, context.householdId),
        context.previousDetail,
      );
      queryClient.setQueryData(
        queryKeys.taskDetail.byId(taskId, context.householdId),
        context.previousTaskDetail,
      );
    },
    onSuccess: async (_data, taskId, context) => {
      if (!context) return;

      await invalidateTaskMutationGraph(queryClient, {
        householdId: context.householdId,
        type: 'complete',
        taskId,
        taskDate: context.taskDate,
      });
    },
  });
}

export function usePostponeTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => {
      const { householdId } = getLinkedScopeOrThrow(queryClient);
      return postponeTask(taskId, householdId);
    },
    onMutate: async (taskId) => {
      const { householdId } = getLinkedScopeOrThrow(queryClient);

      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.today(householdId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(taskId, householdId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.taskDetail.byId(taskId, householdId) });

      const previousToday = queryClient.getQueryData<Task[]>(queryKeys.tasks.today(householdId));
      const previousDetail = queryClient.getQueryData<Task | null>(queryKeys.tasks.detail(taskId, householdId));
      const previousTaskDetail = queryClient.getQueryData<Task | null>(
        queryKeys.taskDetail.byId(taskId, householdId),
      );

      const taskDate =
        previousDetail?.date ??
        previousTaskDetail?.date ??
        findTaskInCache(queryClient, householdId, taskId)?.date ??
        null;

      queryClient.setQueryData<Task[]>(queryKeys.tasks.today(householdId), (current) =>
        (current ?? []).map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: 'postponed',
              }
            : task,
        ),
      );

      queryClient.setQueryData<Task | null>(queryKeys.tasks.detail(taskId, householdId), (current) =>
        current
          ? {
              ...current,
              status: 'postponed',
            }
          : current,
      );

      queryClient.setQueryData<Task | null>(queryKeys.taskDetail.byId(taskId, householdId), (current) =>
        current
          ? {
              ...current,
              status: 'postponed',
            }
          : current,
      );

      return { householdId, taskDate, previousToday, previousDetail, previousTaskDetail };
    },
    onError: (_error, taskId, context) => {
      if (!context) return;

      queryClient.setQueryData(queryKeys.tasks.today(context.householdId), context.previousToday);
      queryClient.setQueryData(
        queryKeys.tasks.detail(taskId, context.householdId),
        context.previousDetail,
      );
      queryClient.setQueryData(
        queryKeys.taskDetail.byId(taskId, context.householdId),
        context.previousTaskDetail,
      );
    },
    onSuccess: async (_data, taskId, context) => {
      if (!context) return;

      await invalidateTaskMutationGraph(queryClient, {
        householdId: context.householdId,
        type: 'postpone',
        taskId,
        taskDate: context.taskDate,
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
      const { householdId } = getLinkedScopeOrThrow(queryClient);

      queryClient.setQueryData(queryKeys.profiles.detail(profile.id, householdId), profile);
      queryClient.setQueryData<Profile[]>(queryKeys.profiles.list(householdId), (current) => {
        if (!current) return [profile];
        if (current.some((item) => item.id === profile.id)) {
          return current.map((item) => (item.id === profile.id ? profile : item));
        }
        return [...current, profile];
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.profiles.list(householdId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.metrics.weeklyPulse(householdId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.metrics.equity(householdId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.metrics.pointsBreakdown(householdId) }),
      ]);
    },
  });
}

export function useAddShoppingItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => addShoppingItem(name, getLinkedScopeOrThrow(queryClient)),
    onSuccess: (item) => {
      queryClient.setQueryData<ShoppingItem[]>(queryKeys.shopping.list(item.household_id), (current) => {
        const deduped = (current ?? []).filter((existing) => existing.id !== item.id);
        return sortShoppingItems([item, ...deduped]);
      });
    },
  });
}

export function useTogglePurchasedMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, currentValue }: { id: string; currentValue: boolean }) => {
      const { householdId } = getLinkedScopeOrThrow(queryClient);
      return togglePurchased(id, currentValue, householdId);
    },
    onMutate: async ({ id, currentValue }) => {
      const { householdId } = getLinkedScopeOrThrow(queryClient);

      await queryClient.cancelQueries({ queryKey: queryKeys.shopping.list(householdId) });
      const previous = queryClient.getQueryData<ShoppingItem[]>(queryKeys.shopping.list(householdId));

      queryClient.setQueryData<ShoppingItem[]>(queryKeys.shopping.list(householdId), (current) =>
        sortShoppingItems(
          (current ?? []).map((item) =>
            item.id === id ? { ...item, is_purchased: !currentValue } : item,
          ),
        ),
      );

      return { previous, householdId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.shopping.list(context.householdId), context.previous);
      }
    },
    onSettled: async (_data, error, _variables, context) => {
      if (!error || !context) return;
      await queryClient.invalidateQueries({ queryKey: queryKeys.shopping.list(context.householdId) });
    },
  });
}

export function useUpdateQuantityMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) => {
      const { householdId } = getLinkedScopeOrThrow(queryClient);
      return updateQuantity(id, quantity, householdId);
    },
    onMutate: async ({ id, quantity }) => {
      const { householdId } = getLinkedScopeOrThrow(queryClient);

      await queryClient.cancelQueries({ queryKey: queryKeys.shopping.list(householdId) });
      const previous = queryClient.getQueryData<ShoppingItem[]>(queryKeys.shopping.list(householdId));

      queryClient.setQueryData<ShoppingItem[]>(queryKeys.shopping.list(householdId), (current) =>
        sortShoppingItems((current ?? []).map((item) => (item.id === id ? { ...item, quantity } : item))),
      );

      return { previous, householdId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.shopping.list(context.householdId), context.previous);
      }
    },
    onSettled: async (_data, error, _variables, context) => {
      if (!error || !context) return;
      await queryClient.invalidateQueries({ queryKey: queryKeys.shopping.list(context.householdId) });
    },
  });
}

export function useDeleteShoppingItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      const { householdId } = getLinkedScopeOrThrow(queryClient);
      return deleteShoppingItem(id, householdId);
    },
    onMutate: async (id) => {
      const { householdId } = getLinkedScopeOrThrow(queryClient);

      await queryClient.cancelQueries({ queryKey: queryKeys.shopping.list(householdId) });
      const previous = queryClient.getQueryData<ShoppingItem[]>(queryKeys.shopping.list(householdId));

      queryClient.setQueryData<ShoppingItem[]>(queryKeys.shopping.list(householdId), (current) =>
        (current ?? []).filter((item) => item.id !== id),
      );

      return { previous, householdId };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.shopping.list(context.householdId), context.previous);
      }
    },
    onSettled: async (_data, error, _variables, context) => {
      if (!error || !context) return;
      await queryClient.invalidateQueries({ queryKey: queryKeys.shopping.list(context.householdId) });
    },
  });
}

// Invite hooks

export function useCreateHouseholdAndInviteMutation() {
  return useMutation({
    mutationFn: () => createHouseholdAndInvite(),
  });
}

export function useGetOrCreateHouseholdInviteMutation() {
  return useMutation({
    mutationFn: ({ householdId, profileId }: { householdId: string; profileId: string }) =>
      getOrCreateHouseholdInvite(householdId, profileId),
  });
}

export function useAcceptHouseholdInviteMutation() {
  return useMutation({
    mutationFn: (inviteCode: string) => acceptHouseholdInvite(inviteCode),
  });
}

export function useInviteInfoQuery(inviteCode: string | null) {
  return useQuery<InviteInfo>({
    queryKey: inviteCode ? queryKeys.invites.info(inviteCode) : ['invites', 'info', 'disabled'],
    queryFn: () => getInviteInfo(inviteCode as string),
    enabled: Boolean(inviteCode),
  });
}

export function useSendEmailInviteMutation() {
  return useMutation({
    mutationFn: (params: { inviteCode: string; email: string; senderName: string }) =>
      sendEmailInvite(params),
  });
}
