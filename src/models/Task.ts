import { differenceInDays, parseISO } from 'date-fns';
import { getLocalDateString } from '../utils';
import type { Task as DbTask } from '../lib/types';

export type TaskStatus = 'pending' | 'completed' | 'expired' | 'past_due';

/**
 * Robust frontend model for Tasks.
 * This should be used throughout the app instead of raw Supabase types.
 */
export interface Task extends Omit<DbTask, 'status'> {
  status: TaskStatus;
}

/**
 * Normalizes a database task into the frontend Task model.
 * Calculates derived states like 'expired' or 'past_due' on the fly.
 */
export function normalizeTask(dbTask: DbTask): Task {
  if (dbTask.status === 'completed') {
    return { ...dbTask, status: 'completed' };
  }

  // If there's no date (shouldn't happen for tasks, but for safety), it's pending
  if (!dbTask.date) {
    return { ...dbTask, status: 'pending' };
  }

  const todayStr = getLocalDateString();
  const taskDate = parseISO(dbTask.date);
  const todayDate = parseISO(todayStr);
  
  const diff = differenceInDays(todayDate, taskDate);

  // Expiration Logic
  // Daily: Expire if older than 1 day (today/yesterday window)
  // Others: Expire if older than 7 days
  const expirationThreshold = dbTask.frequency === 'daily' ? 1 : 7;
  const isExpired = diff > expirationThreshold;

  if (isExpired) {
    return { ...dbTask, status: 'expired' };
  }

  // If it's in the past but not expired, it's past_due
  if (dbTask.date < todayStr) {
    return { ...dbTask, status: 'past_due' };
  }

  return { ...dbTask, status: 'pending' };
}
