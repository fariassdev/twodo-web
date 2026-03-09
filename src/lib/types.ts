import type { Database } from './database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export type Task = Database['public']['Tables']['tasks']['Row'] & {
  assigned_profile?: Profile;
  last_done_by_profile?: Profile;
};

export type ShoppingItem = Database['public']['Tables']['shopping_items']['Row'];

export type LoveNote = Database['public']['Tables']['love_notes']['Row'] & {
  sender?: Profile;
};

export type Kudos = Database['public']['Tables']['kudos']['Row'];

export type TaskCompletion = Database['public']['Tables']['task_completions']['Row'];
