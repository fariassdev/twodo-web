import { differenceInDays, parseISO } from 'date-fns';
import { getLocalDateString } from '../utils';
import { normalizeProfile } from './profile';
import type { RawTask } from '../supabase/queries/tasks';

// ── Task normalization ─────────────────────────────────────────────────────────

export type AssignmentType = 'individual' | 'anyone' | 'team_work' | 'strict_rotation';
export type TaskStatus = 'pending' | 'completed' | 'expired' | 'past_due';

/**
 * Normalizes a raw Supabase task into the frontend Task model.
 * Calculates derived status (expired/past_due) from the date.
 *
 * Field naming follows the existing convention in models/Task.ts
 * to avoid breaking all existing component consumers.
 */
export const normalizeTask = (raw: RawTask) => {
  const today = getLocalDateString();

  let status: TaskStatus = 'pending';

  if (raw.status === 'completed') {
    status = 'completed';
  } else if (raw.date) {
    const taskDate = parseISO(raw.date);
    const todayDate = parseISO(today);
    const diff = differenceInDays(todayDate, taskDate);

    // Expiration thresholds: daily tasks expire after 1 day, others after 7
    const expirationThreshold = raw.frequency === 'daily' ? 1 : 7;

    if (diff > expirationThreshold) {
      status = 'expired';
    } else if (raw.date < today) {
      status = 'past_due';
    }
  }

  return {
    // Core identity
    id: raw.id,
    title: raw.title,
    description: raw.description,
    date: raw.date,
    type: raw.type as 'task' | 'event',
    priority: raw.priority as 'normal' | 'high',
    // Derived status
    status,
    // Assignment
    assignment_type: raw.assignment_type as AssignmentType,
    assigned_to: raw.assigned_to,
    assigned_profile: raw.assigned_profile ? normalizeProfile(raw.assigned_profile) : null,
    last_done_by: raw.last_done_by,
    last_done_by_profile: raw.last_done_by_profile ? normalizeProfile(raw.last_done_by_profile) : null,
    // Scheduling
    time_of_day: raw.time_of_day as 'morning' | 'afternoon' | 'evening' | 'anytime' | null,
    start_time: raw.start_time,
    end_time: raw.end_time,
    location: raw.location,
    // Points & effort
    points: raw.points,
    effort_level: raw.effort_level,
    // Recurrence
    is_recurring: raw.is_recurring,
    recurrence_id: raw.recurrence_id,
    frequency: raw.frequency as 'daily' | 'weekly' | 'monthly' | null,
    // Catalog
    catalog_task_id: raw.catalog_task_id,
    category: raw.category,
    // Household
    household_id: raw.household_id,
    created_by: raw.created_by,
    // Timestamps
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    deleted_at: raw.deleted_at,
  };
};

/**
 * Task type is inferred from normalizeTask — never manually defined.
 * TypeScript propagates changes automatically to all consumers.
 */
export type Task = ReturnType<typeof normalizeTask>;
