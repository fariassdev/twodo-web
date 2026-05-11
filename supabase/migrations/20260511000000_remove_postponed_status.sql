-- Update any postponed tasks to pending
UPDATE public.tasks SET status = 'pending' WHERE status = 'postponed';

-- Drop the old constraint
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Add the new constraint
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'expired'::text, 'overdue'::text]));
