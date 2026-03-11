export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    context: () => ['auth', 'context'] as const,
  },
  profiles: {
    all: ['profiles'] as const,
    list: (householdId = 'unknown-household') => ['profiles', 'list', householdId] as const,
    detail: (profileId: string, householdId = 'unknown-household') =>
      ['profiles', 'detail', profileId, householdId] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    today: (householdId = 'unknown-household') => ['tasks', 'today', householdId] as const,
    upcoming: (householdId = 'unknown-household') => ['tasks', 'upcoming', householdId] as const,
    month: (year: number, month: number, includeDeleted: boolean) =>
      ['tasks', 'month', year, month, includeDeleted ? 'withDeleted' : 'active'] as const,

    detail: (taskId: string, householdId = 'unknown-household') =>
      ['tasks', 'detail', taskId, householdId] as const,
  },
  calendar: {
    all: ['calendar'] as const,
    month: (year: number, month: number, includeDeleted: boolean, householdId = 'unknown-household') =>
      ['calendar', 'month', year, month, includeDeleted ? 'withDeleted' : 'active', householdId] as const,

  },
  taskDetail: {
    all: ['taskDetail'] as const,
    byId: (taskId: string, householdId = 'unknown-household') =>
      ['taskDetail', taskId, householdId] as const,
  },
  metrics: {
    all: ['metrics'] as const,
    equity: (householdId = 'unknown-household') => ['metrics', 'equity', householdId] as const,
    weeklyPulse: (householdId = 'unknown-household') => ['metrics', 'weeklyPulse', householdId] as const,
    pointsBreakdown: (householdId = 'unknown-household') => ['metrics', 'pointsBreakdown', householdId] as const,
  },
  shopping: {
    all: ['shopping'] as const,
    list: (householdId = 'unknown-household') => ['shopping', 'list', householdId] as const,
  },
  loveNotes: {
    all: ['loveNotes'] as const,
    latest: (householdId = 'unknown-household') => ['loveNotes', 'latest', householdId] as const,
    byTask: (taskId: string, householdId = 'unknown-household') =>
      ['loveNotes', 'task', taskId, householdId] as const,
  },
} as const;
