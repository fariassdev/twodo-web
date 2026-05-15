import type { EffortLevel } from '../constants';

/**
 * Input types for task mutations.
 * These live in domain/ because they describe the shape of data
 * going into the domain, independent of the Supabase schema.
 *
 * Components import these types to type their form state.
 * supabase/mutations/tasks.ts uses them as function parameters.
 */

export interface CreateTaskInput {
  title: string;
  description?: string;
  type: 'task' | 'event';
  priority: 'normal' | 'high';
  date?: string;
  points?: number;
  effort_level?: EffortLevel;
  time_of_day?: 'morning' | 'afternoon' | 'evening' | 'anytime';
  category?: string;
  catalog_task_id?: string | null;
  is_recurring: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly' | null;
  recurrence_id?: string | null;
  assignment_type: 'strict_rotation' | 'team_work' | 'individual' | 'anyone';
  assigned_to?: string | null;
  location?: string;
  start_time?: string;
  end_time?: string;
}

export type UpdateTaskInput = Partial<CreateTaskInput>;

export type AssignmentOverrideType = 'team_work' | 'individual' | 'anyone';

export interface AssignmentOverride {
  type: AssignmentOverrideType;
  assignedTo?: string[];
}
