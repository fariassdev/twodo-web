export const queryKeys = {
  profiles: {
    all: ['profiles'] as const,
    list: () => ['profiles', 'list'] as const,
    detail: (profileId: string) => ['profiles', 'detail', profileId] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    today: () => ['tasks', 'today'] as const,
    upcoming: () => ['tasks', 'upcoming'] as const,
    month: (year: number, month: number, includeDeleted: boolean) =>
      ['tasks', 'month', year, month, includeDeleted ? 'withDeleted' : 'active'] as const,
    date: (date: string, includeDeleted: boolean) =>
      ['tasks', 'date', date, includeDeleted ? 'withDeleted' : 'active'] as const,
    detail: (taskId: string) => ['tasks', 'detail', taskId] as const,
  },
  calendar: {
    month: (year: number, month: number, includeDeleted: boolean) =>
      ['calendar', 'month', year, month, includeDeleted ? 'withDeleted' : 'active'] as const,
    date: (date: string, includeDeleted: boolean) =>
      ['calendar', 'date', date, includeDeleted ? 'withDeleted' : 'active'] as const,
  },
  taskDetail: {
    byId: (taskId: string) => ['taskDetail', taskId] as const,
  },
  metrics: {
    all: ['metrics'] as const,
    equity: () => ['metrics', 'equity'] as const,
    weeklyPulse: () => ['metrics', 'weeklyPulse'] as const,
    pointsBreakdown: () => ['metrics', 'pointsBreakdown'] as const,
  },
  shopping: {
    all: ['shopping'] as const,
    list: () => ['shopping', 'list'] as const,
  },
  loveNotes: {
    all: ['loveNotes'] as const,
    latest: () => ['loveNotes', 'latest'] as const,
    byTask: (taskId: string) => ['loveNotes', 'task', taskId] as const,
  },
} as const;
