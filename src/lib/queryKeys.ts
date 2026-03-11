export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    context: () => ['auth', 'context'] as const,
  },
  profiles: {
    all: ['profiles'] as const,
    list: (householdId: string) => ['profiles', 'list', householdId] as const,
    detail: (profileId: string, householdId: string) =>
      ['profiles', 'detail', profileId, householdId] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    today: (householdId: string) => ['tasks', 'today', householdId] as const,
    upcoming: (householdId: string) => ['tasks', 'upcoming', householdId] as const,
    month: (year: number, month: number, includeDeleted: boolean, householdId: string) =>
      ['tasks', 'month', year, month, includeDeleted ? 'withDeleted' : 'active', householdId] as const,

    detail: (taskId: string, householdId: string) =>
      ['tasks', 'detail', taskId, householdId] as const,
  },
  calendar: {
    all: ['calendar'] as const,
    month: (year: number, month: number, includeDeleted: boolean, householdId: string) =>
      ['calendar', 'month', year, month, includeDeleted ? 'withDeleted' : 'active', householdId] as const,

  },
  taskDetail: {
    all: ['taskDetail'] as const,
    byId: (taskId: string, householdId: string) =>
      ['taskDetail', taskId, householdId] as const,
  },
  metrics: {
    all: ['metrics'] as const,
    equity: (householdId: string) => ['metrics', 'equity', householdId] as const,
    weeklyPulse: (householdId: string) => ['metrics', 'weeklyPulse', householdId] as const,
    pointsBreakdown: (householdId: string) => ['metrics', 'pointsBreakdown', householdId] as const,
  },
  shopping: {
    all: ['shopping'] as const,
    list: (householdId: string) => ['shopping', 'list', householdId] as const,
  },
  loveNotes: {
    all: ['loveNotes'] as const,
    latest: (householdId: string) => ['loveNotes', 'latest', householdId] as const,
    byTask: (taskId: string, householdId: string) =>
      ['loveNotes', 'task', taskId, householdId] as const,
  },
} as const;
