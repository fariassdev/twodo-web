
-- Update all tasks with statuses overdue, expired, or postponed to pending
UPDATE tasks SET status = 'pending' WHERE status IN ('overdue', 'expired', 'postponed');

-- Simplify the status constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text]));
