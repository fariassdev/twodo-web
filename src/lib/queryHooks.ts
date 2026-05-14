import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useEffect, useMemo } from 'react';
import {
  acceptHouseholdInvite,
  addShoppingItem,
  createExpense,
  createHouseholdAndInvite,
  createSettlement,
  deleteExpense,
  deleteShoppingItem,
  getExpenseBalanceSnapshot,
  getExpenseById,
  getExpensesActivityFeedPage,
  getExpenseCategories,
  getExpensesDashboard,
  getExpensesList,
  getInviteInfo,
  getEquityBalance,
  getLatestLoveNote,
  getLoveNoteForTask,
  getOrCreateHouseholdInvite,
  getBalanceScore,
  getPointsBreakdown,
  getShoppingItems,
  getSettlementsHistory,
  getWeeklyPulse,
  sendEmailInvite,
  togglePurchased,
  updateProfile,
  updateQuantity,
  updateExpense,
  type BalanceScoreData,
  type CreateExpenseInput,
  type ExpenseActivityFeedPage,
  type ExpenseBalanceSnapshot,
  type ExpenseDashboardData,
  type ExpenseFilters,
  type SettlementWithDetails,
  type EquityBalance,
  type PointsBreakdown,
  type UpdateProfileInput,
  type UpdateExpenseInput,
  type WeeklyPulse,
  getProfileById,
  getProfiles,
} from './queries';
import { queryKeys } from './queryKeys';
import {
  supabase,
} from './supabase';
import { authQueryKeys } from '../supabase/auth';
import { normalizeSearchText } from '../helpers/expense';
import { useAuthScope } from '../context/AuthContext';
import type {
  AuthContext,
  ExpenseCategory,
  ExpenseWithDetails,
  InviteInfo,
  LoveNote,
  Profile,
  ShoppingItem,
} from './types';

function disabledKey(...segments: string[]) {
  return ['disabled', ...segments] as const;
}

function isDomainForHousehold(queryKey: QueryKey, domain: string, householdId: string): boolean {
  return Array.isArray(queryKey) && queryKey[0] === domain && queryKey.some((part) => part === householdId);
}

function getExpenseFiltersSignature(filters: ExpenseFilters = {}): string {
  const normalizedSearchText = filters.searchText ? normalizeSearchText(filters.searchText) : null;

  return JSON.stringify({
    categoryId: filters.categoryId ?? null,
    paidByProfileId: filters.paidByProfileId ?? null,
    searchText: normalizedSearchText,
    fromDate: filters.fromDate ?? null,
    toDate: filters.toDate ?? null,
  });
}

async function invalidateExpenseMutationGraph(
  queryClient: QueryClient,
  householdId: string,
  expenseId?: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      predicate: (query) => isDomainForHousehold(query.queryKey, 'expenses', householdId),
    }),
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses.categories() }),
  ]);

  if (expenseId) {
    await queryClient.invalidateQueries({ queryKey: queryKeys.expenses.detail(expenseId, householdId) });
  }
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

function findExpenseInCache(
  queryClient: QueryClient,
  householdId: string,
  expenseId: string,
): ExpenseWithDetails | undefined {
  const candidates = queryClient
    .getQueryCache()
    .findAll({
      predicate: (query) => {
        const queryKey = query.queryKey;
        return Array.isArray(queryKey) && queryKey[0] === 'expenses' && queryKey.some((part) => part === householdId);
      },
    })
    .map((query) => query.state.data);

  for (const data of candidates) {
    if (!data) continue;

    if (Array.isArray(data)) {
      const found = (data as ExpenseWithDetails[]).find((expense) => expense.id === expenseId);
      if (found) return found;
      continue;
    }

    if (typeof data === 'object' && data !== null && 'id' in data) {
      const maybeExpense = data as ExpenseWithDetails;
      if (maybeExpense.id === expenseId) return maybeExpense;
      continue;
    }

    if (typeof data === 'object' && data !== null && 'recentExpenses' in data) {
      const maybeDashboard = data as ExpenseDashboardData;
      const found = maybeDashboard.recentExpenses.find((expense) => expense.id === expenseId);
      if (found) return found;
      continue;
    }

    if (typeof data === 'object' && data !== null && 'pages' in data) {
      const maybeInfinite = data as { pages?: Array<{ items?: unknown[] }> };

      for (const page of maybeInfinite.pages ?? []) {
        const items = page.items ?? [];
        for (const item of items) {
          if (!item || typeof item !== 'object' || !('type' in item)) continue;
          const maybeFeedItem = item as {
            type?: string;
            expense?: ExpenseWithDetails;
          };

          if (maybeFeedItem.type === 'expense' && maybeFeedItem.expense?.id === expenseId) {
            return maybeFeedItem.expense;
          }
        }
      }
    }
  }

  return undefined;
}

export function useProfilesQuery() {
  const { householdId } = useAuthScope();

  return useQuery<Profile[]>({
    queryKey: householdId ? queryKeys.profiles.list(householdId) : disabledKey('profiles', 'list'),
    queryFn: () => getProfiles(householdId as string),
    enabled: Boolean(householdId),
  });
}

export function useProfileQuery(profileId: string | undefined) {
  const { householdId } = useAuthScope();

  return useQuery<Profile | null>({
    queryKey:
      profileId && householdId
        ? queryKeys.profiles.detail(profileId, householdId)
        : ['profiles', 'detail', 'disabled', profileId ?? 'none'],
    queryFn: () => getProfileById(profileId as string, householdId as string),
    enabled: Boolean(profileId && householdId),
  });
}


export function useLatestLoveNoteQuery() {
  const { householdId } = useAuthScope();

  return useQuery<LoveNote | null>({
    queryKey: householdId ? queryKeys.loveNotes.latest(householdId) : disabledKey('loveNotes', 'latest'),
    queryFn: () => getLatestLoveNote(householdId as string),
    enabled: Boolean(householdId),
  });
}

export function useLoveNoteForTaskQuery(taskId: string | undefined) {
  const { householdId } = useAuthScope();

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
  const { householdId } = useAuthScope();

  return useQuery<WeeklyPulse>({
    queryKey: householdId ? queryKeys.metrics.weeklyPulse(householdId) : disabledKey('metrics', 'weeklyPulse'),
    queryFn: () => getWeeklyPulse(householdId as string),
    enabled: Boolean(householdId),
  });
}

export function useEquityBalanceQuery(profiles: Profile[] | undefined) {
  const { householdId } = useAuthScope();

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

export function useBalanceScoreQuery(startDate: string, endDate: string) {
  const { householdId } = useAuthScope();

  return useQuery<BalanceScoreData>({
    queryKey: householdId ? queryKeys.metrics.balanceScore(householdId, startDate, endDate) : ['metrics', 'balanceScore', 'disabled'],
    queryFn: () => getBalanceScore(householdId as string, startDate, endDate),
    enabled: Boolean(householdId),
  });
}

export function usePointsBreakdownQuery(profiles: Profile[] | undefined) {
  const { householdId } = useAuthScope();

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
  const { householdId } = useAuthScope();

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

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ profileId, input }: { profileId: string; input: UpdateProfileInput }) =>
      updateProfile(profileId, input),
    onSuccess: async (profile) => {
      const { householdId } = useAuthScope();

      queryClient.setQueryData(queryKeys.profiles.detail(profile.id, householdId), profile);
      queryClient.setQueryData<Profile[]>(queryKeys.profiles.list(householdId), (current) => {
        if (!current) return [profile];
        if (current.some((item) => item.id === profile.id)) {
          return current.map((item) => (item.id === profile.id ? profile : item));
        }
        return [...current, profile];
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: authQueryKeys.context() }),
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
  const scope = useAuthScope();

  return useMutation({
    mutationFn: (name: string) => addShoppingItem(name, scope),
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
  const { householdId } = useAuthScope();

  return useMutation({
    mutationFn: ({ id, currentValue }: { id: string; currentValue: boolean }) => {
      return togglePurchased(id, currentValue, householdId);
    },
    onMutate: async ({ id, currentValue }) => {
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
  const { householdId } = useAuthScope();

  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) => {
      return updateQuantity(id, quantity, householdId);
    },
    onMutate: async ({ id, quantity }) => {
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
  const { householdId } = useAuthScope();

  return useMutation({
    mutationFn: (id: string) => {
      return deleteShoppingItem(id, householdId);
    },
    onMutate: async (id) => {

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

export function useExpenseCategoriesQuery() {
  return useQuery<ExpenseCategory[]>({
    queryKey: queryKeys.expenses.categories(),
    queryFn: getExpenseCategories,
  });
}

export function useExpensesDashboardQuery() {
  const { householdId, profileId } = useAuthScope();

  return useQuery<ExpenseDashboardData>({
    queryKey:
      householdId && profileId
        ? queryKeys.expenses.dashboard(householdId, profileId)
        : disabledKey('expenses', 'dashboard'),
    queryFn: () => getExpensesDashboard(householdId as string, profileId as string),
    enabled: Boolean(householdId && profileId),
  });
}

export function useExpenseBalanceSnapshotQuery() {
  const { householdId, profileId } = useAuthScope();

  return useQuery<ExpenseBalanceSnapshot>({
    queryKey:
      householdId && profileId
        ? queryKeys.expenses.balance(householdId, profileId)
        : disabledKey('expenses', 'balance'),
    queryFn: () => getExpenseBalanceSnapshot(householdId as string, profileId as string),
    enabled: Boolean(householdId && profileId),
  });
}

export function useExpensesActivityFeedInfiniteQuery(pageSize = 20, options?: { enabled?: boolean }) {
  const { householdId } = useAuthScope();
  const isEnabled = options?.enabled ?? true;

  return useInfiniteQuery<ExpenseActivityFeedPage>({
    queryKey: householdId ? queryKeys.expenses.feed(householdId) : disabledKey('expenses', 'feed'),
    queryFn: ({ pageParam }) =>
      getExpensesActivityFeedPage(householdId as string, pageSize, Number(pageParam ?? 0)),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.pageIndex + 1 : undefined),
    enabled: Boolean(householdId) && isEnabled,
    staleTime: 30000,
  });
}

export function useExpensesListQuery(filters: ExpenseFilters = {}, options?: { enabled?: boolean }) {
  const { householdId } = useAuthScope();
  const signature = useMemo(() => getExpenseFiltersSignature(filters), [filters]);
  const isEnabled = options?.enabled ?? true;

  return useQuery<ExpenseWithDetails[]>({
    queryKey: householdId
      ? queryKeys.expenses.list(householdId, signature)
      : disabledKey('expenses', 'list', signature),
    queryFn: () => getExpensesList(householdId as string, filters),
    enabled: Boolean(householdId) && isEnabled,
    placeholderData: keepPreviousData,
  });
}

export function useExpenseByIdQuery(expenseId: string | undefined) {
  const queryClient = useQueryClient();
  const { householdId } = useAuthScope();

  return useQuery<ExpenseWithDetails | null>({
    queryKey:
      expenseId && householdId
        ? queryKeys.expenses.detail(expenseId, householdId)
        : disabledKey('expenses', 'detail', expenseId ?? 'none'),
    queryFn: () => getExpenseById(expenseId as string, householdId as string),
    enabled: Boolean(expenseId && householdId),
    initialData:
      expenseId && householdId
        ? findExpenseInCache(queryClient, householdId, expenseId) ?? undefined
        : undefined,
  });
}

export function useSettlementsHistoryQuery() {
  const { householdId } = useAuthScope();

  return useQuery<SettlementWithDetails[]>({
    queryKey: householdId
      ? queryKeys.expenses.settlements(householdId)
      : disabledKey('expenses', 'settlements'),
    queryFn: () => getSettlementsHistory(householdId as string),
    enabled: Boolean(householdId),
  });
}

export function useCreateExpenseMutation() {
  const queryClient = useQueryClient();
  const scope = useAuthScope();

  return useMutation({
    mutationFn: (input: CreateExpenseInput) => createExpense(input, scope),
    onSuccess: async (expense) => {
      const householdId = expense.household_id;
      queryClient.setQueryData<ExpenseWithDetails | null>(
        queryKeys.expenses.detail(expense.id, householdId),
        expense,
      );

      await invalidateExpenseMutationGraph(queryClient, householdId, expense.id);
    },
  });
}

export function useUpdateExpenseMutation() {
  const queryClient = useQueryClient();
  const scope = useAuthScope();

  return useMutation({
    mutationFn: ({ expenseId, input }: { expenseId: string; input: UpdateExpenseInput }) =>
      updateExpense(expenseId, input, scope),
    onSuccess: async (expense) => {
      const householdId = expense.household_id;
      queryClient.setQueryData<ExpenseWithDetails | null>(
        queryKeys.expenses.detail(expense.id, householdId),
        expense,
      );

      await invalidateExpenseMutationGraph(queryClient, householdId, expense.id);
    },
  });
}

export function useDeleteExpenseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expenseId: string) => {
      const { householdId } = useAuthScope();
      return deleteExpense(expenseId, householdId);
    },
    onMutate: async (expenseId) => {
      const { householdId } = useAuthScope();
      queryClient.removeQueries({ queryKey: queryKeys.expenses.detail(expenseId, householdId) });
      return { householdId, expenseId };
    },
    onSuccess: async (_data, _expenseId, context) => {
      if (!context) return;
      await invalidateExpenseMutationGraph(queryClient, context.householdId, context.expenseId);
    },
  });
}

export function useCreateSettlementMutation() {
  const queryClient = useQueryClient();
  const scope = useAuthScope();

  return useMutation({
    mutationFn: ({ note }: { note?: string }) => createSettlement({ note }, scope),
    onSuccess: async (settlement) => {
      await invalidateExpenseMutationGraph(queryClient, settlement.household_id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.expenses.settlements(settlement.household_id) });
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

export function useInviteInfoQuery(
  inviteCode: string | null,
  options?: { enabled?: boolean; refetchInterval?: number | false },
) {
  const enabled = (options?.enabled ?? true) && Boolean(inviteCode);

  return useQuery<InviteInfo>({
    queryKey: inviteCode ? queryKeys.invites.info(inviteCode) : ['invites', 'info', 'disabled'],
    queryFn: () => getInviteInfo(inviteCode as string),
    enabled,
    refetchInterval: options?.refetchInterval,
  });
}

export function useSendEmailInviteMutation() {
  return useMutation({
    mutationFn: (params: { inviteCode: string; email: string; senderName: string }) =>
      sendEmailInvite(params),
  });
}
