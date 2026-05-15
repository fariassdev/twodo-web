/**
 * Query key factory for the Task domain.
 * Co-located with the hooks so both queries and mutations
 * can import the same keys without circular dependencies.
 *
 * Structure follows TkDodo's recommended factory pattern:
 * taskKeys.all(householdId) is the root — invalidating it
 * cascades to every task query for that household.
 */
export const taskKeys = {
  all: (householdId: string) =>
    ['tasks', householdId] as const,

  range: (householdId: string, startDate: string, endDate: string, includeDeleted: boolean) =>
    ['tasks', householdId, 'range', startDate, endDate, includeDeleted] as const,

  detail: (householdId: string, taskId: string) =>
    ['tasks', householdId, 'detail', taskId] as const,

  completions: (householdId: string, taskId: string) =>
    ['tasks', householdId, 'completions', taskId] as const,

  count: (householdId: string) =>
    ['tasks', householdId, 'count'] as const,

  catalog: () =>
    ['task-catalog'] as const,
};
