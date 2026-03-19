
-- First drop the old constraint
ALTER TABLE tasks DROP CONSTRAINT tasks_priority_check;

-- Update existing data
UPDATE tasks SET priority = 'high' WHERE priority = 'critical';
UPDATE tasks SET priority = 'normal' WHERE priority = 'flexible';

-- Add new constraint
ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check
  CHECK (priority = ANY (ARRAY['normal'::text, 'high'::text]));
