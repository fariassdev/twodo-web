export const expenseKeys = {
  all: (householdId: string) => ['expenses', householdId] as const,
  categories: () => ['expenses', 'categories'] as const,
  lists: (householdId: string) => [...expenseKeys.all(householdId), 'list'] as const,
  list: (householdId: string, filters: string) => [...expenseKeys.lists(householdId), filters] as const,
  details: (householdId: string) => [...expenseKeys.all(householdId), 'detail'] as const,
  detail: (householdId: string, id: string) => [...expenseKeys.details(householdId), id] as const,
  balance: (householdId: string, profileId: string) => [...expenseKeys.all(householdId), 'balance', profileId] as const,
  settlements: (householdId: string) => [...expenseKeys.all(householdId), 'settlements'] as const,
  feed: (householdId: string) => [...expenseKeys.all(householdId), 'feed'] as const,
};
