-- Migration: allow 'anyone' value in tasks.assignment_type check constraint
-- Run this SQL against your Supabase/Postgres database (via psql, supabase CLI, or the SQL editor) before using the app.

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_assignment_type_check;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_assignment_type_check
    CHECK (assignment_type IN ('strict_rotation', 'team_work', 'individual', 'anyone'));

-- note: the existing constraint likely only allowed the first three values, which caused the 23514 error.
-- after running this migration you should be able to update tasks to assignment_type = 'anyone'.