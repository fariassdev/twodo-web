export const profileKeys = {
  all: (householdId: string) => ['profiles', householdId] as const,
  lists: (householdId: string) => [...profileKeys.all(householdId), 'list'] as const,
  details: (householdId: string) => [...profileKeys.all(householdId), 'detail'] as const,
  detail: (householdId: string, profileId: string) => [...profileKeys.details(householdId), profileId] as const,
};
