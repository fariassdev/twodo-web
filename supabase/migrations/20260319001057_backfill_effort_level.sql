
-- Backfill effort_level based on existing points
UPDATE tasks SET effort_level = CASE
  WHEN points <= 2 THEN 'S'
  WHEN points <= 5 THEN 'M'
  WHEN points <= 10 THEN 'L'
  ELSE 'XL'
END
WHERE type = 'task' AND effort_level IS NULL;

-- Set default time_of_day for existing tasks
UPDATE tasks SET time_of_day = 'anytime'
WHERE type = 'task' AND time_of_day IS NULL;
