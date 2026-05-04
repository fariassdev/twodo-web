export const EFFORT_LEVELS = ['S', 'M', 'L', 'XL'] as const;
export type EffortLevel = (typeof EFFORT_LEVELS)[number];

export const EFFORT_POINTS: Record<EffortLevel, number> = {
  S: 2,
  M: 4,
  L: 8,
  XL: 16,
};

export const TIME_OF_DAY_OPTIONS = ['morning', 'afternoon', 'evening', 'anytime'] as const;
export type TimeOfDay = (typeof TIME_OF_DAY_OPTIONS)[number];

export const TASK_CATEGORIES = [
  'trash',
  'cleaning',
  'bathroom',
  'kitchen',
  'shopping',
  'laundry',
  'other',
] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];