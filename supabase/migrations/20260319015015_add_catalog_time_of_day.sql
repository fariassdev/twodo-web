-- Add default_time_of_day column to task_catalog
ALTER TABLE task_catalog
  ADD COLUMN default_time_of_day TEXT CHECK (default_time_of_day IN ('morning', 'afternoon', 'evening', 'anytime'));

-- Split cook_meal into cook_lunch and cook_dinner
DELETE FROM task_catalog WHERE key = 'cook_meal';

INSERT INTO task_catalog (key, name_es, name_en, category, icon, default_points, default_effort_level, sort_order, default_time_of_day) VALUES
  ('cook_lunch', 'Cocinar comida', 'Cook lunch', 'kitchen', '🍳', 8, 'L', 15, 'morning'),
  ('cook_dinner', 'Cocinar cena', 'Cook dinner', 'kitchen', '🍳', 8, 'L', 16, 'evening')
ON CONFLICT (key) DO UPDATE SET
  name_es = EXCLUDED.name_es,
  name_en = EXCLUDED.name_en,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  default_points = EXCLUDED.default_points,
  default_effort_level = EXCLUDED.default_effort_level,
  sort_order = EXCLUDED.sort_order,
  default_time_of_day = EXCLUDED.default_time_of_day;

-- Backfill default_time_of_day for existing entries
UPDATE task_catalog SET default_time_of_day = 'morning' WHERE key IN ('make_bed', 'prepare_breakfast', 'laundry_start');
UPDATE task_catalog SET default_time_of_day = 'evening' WHERE key IN ('take_out_trash', 'recycle_containers');
UPDATE task_catalog SET default_time_of_day = 'anytime' WHERE default_time_of_day IS NULL;

-- Fix sort_order for entries after the split (grocery_list onwards shifted by 1)
UPDATE task_catalog SET sort_order = 17 WHERE key = 'grocery_list';
UPDATE task_catalog SET sort_order = 18 WHERE key = 'weekly_groceries';
UPDATE task_catalog SET sort_order = 19 WHERE key = 'laundry_start';
UPDATE task_catalog SET sort_order = 20 WHERE key = 'laundry_hang';
UPDATE task_catalog SET sort_order = 21 WHERE key = 'laundry_fold';
UPDATE task_catalog SET sort_order = 22 WHERE key = 'iron';
