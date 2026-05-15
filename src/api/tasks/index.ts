/**
 * Public API for the Task domain.
 * Components import everything from here — never from queries.ts or mutations.ts directly.
 */

// Queries
export { useTasksInRange, useTask, useTaskCompletions, useTaskCount, useTaskCatalog } from './queries';
export type { UseTasksInRangeParams } from './queries';

// Mutations
export {
  useCreateTask,
  useCreateTasks,
  useUpdateTask,
  useDeleteTask,
  useCompleteTask,
  useUpdateTaskSeries,
  useDeleteTaskSeries,
  useDeleteTasksAfter,
  useUpdateCompletionAssignment,
} from './mutations';

// Keys (re-exported for advanced use cases, e.g. prefetching in loaders)
export { taskKeys } from './keys';
export { useAdjacentMonthsPrefetch } from './prefetch';
