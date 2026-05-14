export const shoppingKeys = {
  all: (householdId: string) => ['shopping', householdId] as const,
  lists: (householdId: string) => [...shoppingKeys.all(householdId), 'list'] as const,
};
