import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useAuthScope } from '../../context/AuthContext';
import {
  fetchExpenseBalanceSnapshot,
  fetchExpenseById,
  fetchExpenseCategories,
  fetchExpenses,
  fetchSettlements,
  getExpensesActivityFeedPage,
} from '../../supabase/queries/expenses';
import { expenseKeys } from './keys';
import { useProfiles } from '../../api/profiles';
import { normalizeProfile } from '../../domain/profile';
import type { RawExpense, RawSettlement } from '../../supabase/queries/expenses';
import {
  ExpenseActivityFeedItem,
  normalizeExpense,
  normalizeSettlement,
} from '../../domain/expense';

export const useExpenseCategories = () => {
  return useQuery({
    queryKey: expenseKeys.categories(),
    queryFn: fetchExpenseCategories,
    staleTime: Infinity,
  });
};

export const useExpenses = (filters: Parameters<typeof fetchExpenses>[1] = {}) => {
  const { householdId } = useAuthScope();
  const filterKey = JSON.stringify(filters);

  return useQuery({
    queryKey: expenseKeys.list(householdId, filterKey),
    queryFn: () => fetchExpenses(householdId, filters),
    select: (raw) => raw.map(normalizeExpense),
    placeholderData: keepPreviousData,
    enabled: Boolean(householdId),
  });
};

export const useExpense = (id: string | undefined) => {
  const { householdId } = useAuthScope();

  return useQuery({
    queryKey: expenseKeys.detail(householdId, id!),
    queryFn: () => fetchExpenseById(id!, householdId),
    select: (raw) => (raw ? normalizeExpense(raw) : null),
    enabled: Boolean(householdId && id),
  });
};

export const useSettlements = () => {
  const { householdId } = useAuthScope();

  return useQuery({
    queryKey: expenseKeys.settlements(householdId),
    queryFn: () => fetchSettlements(householdId),
    select: (raw) => raw.map(normalizeSettlement),
    enabled: Boolean(householdId),
  });
};

export const useExpenseBalanceSnapshot = () => {
  const { householdId, profileId } = useAuthScope();
  const { data: profiles } = useProfiles();

  return useQuery({
    queryKey: expenseKeys.balance(householdId, profileId),
    queryFn: async () => {
      const { balanceCents, lastSettlementAt } = await fetchExpenseBalanceSnapshot(householdId!, profileId!);
      
      const counterpartyProfile = profiles?.find((profile) => profile.id !== profileId) ?? null;

      if (balanceCents > 0) {
        return {
          balanceCents,
          amountCents: balanceCents,
          direction: 'you_are_owed' as const,
          counterpartyProfile,
          lastSettlementAt,
        };
      }

      if (balanceCents < 0) {
        return {
          balanceCents,
          amountCents: Math.abs(balanceCents),
          direction: 'you_owe' as const,
          counterpartyProfile,
          lastSettlementAt,
        };
      }

      return {
        balanceCents: 0,
        amountCents: 0,
        direction: 'settled' as const,
        counterpartyProfile,
        lastSettlementAt,
      };
    },
    enabled: Boolean(householdId && profileId && profiles),
  });
};


export const useExpensesFeed = (pageSize = 20) => {
  const { householdId } = useAuthScope();

  return useInfiniteQuery({
    queryKey: expenseKeys.feed(householdId),
    queryFn: async ({ pageParam = 0 }) => {
      const pageData = await getExpensesActivityFeedPage(householdId!, pageSize, pageParam as number);

      const items: ExpenseActivityFeedItem[] = pageData.items.map((item) => {
        if (item.type === 'expense') {
          return {
            type: 'expense',
            id: item.id,
            activity_day: item.activity_day,
            activity_at: item.activity_at,
            created_at: item.created_at,
            expense: normalizeExpense(item.raw as RawExpense),
          };
        } else {
          return {
            type: 'settlement',
            id: item.id,
            activity_day: item.activity_day,
            activity_at: item.activity_at,
            created_at: item.created_at,
            settlement: normalizeSettlement(item.raw as RawSettlement),
          };
        }
      });

      return {
        items,
        nextPage: pageData.hasMore ? (pageParam as number) + 1 : undefined,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: Boolean(householdId),
  });
};
