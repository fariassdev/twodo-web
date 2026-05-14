export const loveNoteKeys = {
  all: (householdId: string) => ['loveNotes', householdId] as const,
  latest: (householdId: string) => [...loveNoteKeys.all(householdId), 'latest'] as const,
  byTask: (taskId: string, householdId: string) => [...loveNoteKeys.all(householdId), 'task', taskId] as const,
};
