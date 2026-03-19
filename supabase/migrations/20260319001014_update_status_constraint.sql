
-- Update status constraint to include expired and overdue
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'postponed'::text, 'expired'::text, 'overdue'::text]));
