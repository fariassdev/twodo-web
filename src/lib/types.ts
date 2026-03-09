export interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  type: 'task' | 'event';
  priority: 'critical' | 'flexible';
  status: 'pending' | 'completed' | 'postponed';
  date: string | null;
  points: number;
  is_recurring: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | null;
  assignment_type: 'strict_rotation' | 'team_work' | 'individual';
  assigned_to: string | null;
  last_done_by: string | null;
  location: string | null;
  start_time: string | null;
  end_time: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  assigned_profile?: Profile;
  last_done_by_profile?: Profile;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  is_purchased: boolean;
  added_by: string | null;
  created_at: string;
}

export interface LoveNote {
  id: string;
  content: string;
  from_profile: string;
  to_profile: string;
  task_id: string | null;
  created_at: string;
  // Joined
  sender?: Profile;
}

export interface Kudos {
  id: string;
  from_profile: string;
  to_profile: string;
  points: number;
  message: string | null;
  created_at: string;
}

export interface TaskCompletion {
  id: string;
  task_id: string;
  completed_by: string;
  points_earned: number;
  completed_at: string;
}
