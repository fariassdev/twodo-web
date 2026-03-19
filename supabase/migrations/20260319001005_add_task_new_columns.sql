
-- Add new columns to tasks table
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS effort_level TEXT CHECK (effort_level IN ('S', 'M', 'L', 'XL')),
  ADD COLUMN IF NOT EXISTS time_of_day TEXT CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'anytime')),
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS catalog_task_id UUID REFERENCES task_catalog(id);
