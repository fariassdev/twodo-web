
-- Create task_catalog table
CREATE TABLE task_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name_es TEXT NOT NULL,
  name_en TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT NOT NULL,
  default_points INTEGER NOT NULL,
  default_effort_level TEXT NOT NULL CHECK (default_effort_level IN ('S', 'M', 'L', 'XL')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE task_catalog ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read catalog
CREATE POLICY "Authenticated users can read task catalog"
  ON task_catalog FOR SELECT
  TO authenticated
  USING (true);

-- Seed 21 predefined tasks
INSERT INTO task_catalog (id, key, name_es, name_en, category, icon, default_points, default_effort_level, sort_order) VALUES
  ('01c35629-44cf-4d25-b589-d74c789c5c17', 'take_out_trash', 'Tirar la basura', 'Take out the trash', 'trash', '🗑️', 2, 'S', 1),
  ('f4a945c4-c44a-4215-a2a3-8ae1332f9d80', 'recycle_containers', 'Bajar contenedores de reciclaje', 'Take out recycling', 'trash', '🗑️', 2, 'S', 2),
  ('d565ef80-8253-40b8-94dc-2e7ff2d616f7', 'clean_trash_bin', 'Limpiar cubo de basura', 'Clean trash bin', 'trash', '🗑️', 4, 'M', 3),
  ('0444665c-435a-430c-a4f7-5d0ff515aef8', 'make_bed', 'Hacer la cama', 'Make the bed', 'cleaning', '🛏️', 2, 'S', 4),
  ('22ee09c5-9971-4cc1-9efb-fd6a8b169466', 'tidy_living_room', 'Recoger y ordenar salón', 'Tidy up living room', 'cleaning', '🛏️', 4, 'M', 5),
  ('065587d6-c633-496d-b9c7-c22d9e868c1c', 'vacuum', 'Pasar la aspiradora', 'Vacuum', 'cleaning', '🧹', 4, 'M', 6),
  ('6baa93c8-97a0-4426-ae86-ad4250329cca', 'mop_floor', 'Fregar el suelo', 'Mop the floor', 'cleaning', '🧹', 8, 'L', 7),
  ('b6c6401a-e7ca-49c0-b947-eca7280a2c75', 'dust_general', 'Limpiar polvo (general)', 'Dust (general)', 'cleaning', '🧹', 4, 'M', 8),
  ('926cfd01-715e-46ef-ab09-e035edde052a', 'clean_sink_mirror', 'Limpiar lavabo y espejo', 'Clean sink and mirror', 'bathroom', '🚿', 4, 'M', 9),
  ('701be518-dd57-4eca-8921-d293657288b1', 'clean_bathroom_full', 'Limpiar baño completo', 'Clean full bathroom', 'bathroom', '🚿', 8, 'L', 10),
  ('5555af28-fe1c-48dd-aee3-525e3f056fb0', 'clean_kitchen', 'Limpiar cocina (encimera + vitro)', 'Clean kitchen (counter + stove)', 'kitchen', '🍳', 4, 'M', 11),
  ('cc58c297-0a9e-4486-b02f-78349c085e0d', 'wash_dishes', 'Fregar los platos a mano', 'Wash dishes by hand', 'kitchen', '🍳', 4, 'M', 12),
  ('757fe743-46af-415a-a762-40d0024811f3', 'dishwasher', 'Poner/vaciar lavavajillas', 'Load/unload dishwasher', 'kitchen', '🍳', 2, 'S', 13),
  ('f2f2c859-34eb-4901-95b1-c429062f6243', 'prepare_breakfast', 'Preparar desayuno', 'Prepare breakfast', 'kitchen', '🍳', 2, 'S', 14),
  ('9507455e-78ab-4299-bfba-68bcd4682421', 'cook_meal', 'Cocinar comida o cena', 'Cook lunch or dinner', 'kitchen', '🍳', 8, 'L', 15),
  ('cec77110-9a99-46e7-b65e-b4962c9418cc', 'grocery_list', 'Hacer lista de la compra', 'Make grocery list', 'shopping', '🛒', 4, 'M', 16),
  ('4b9b5386-9da3-4534-b04a-edbd70247821', 'weekly_groceries', 'Hacer la compra semanal', 'Weekly grocery shopping', 'shopping', '🛒', 8, 'L', 17),
  ('b743afec-8d22-47cf-9c75-9ca7ff3b3497', 'laundry_start', 'Poner lavadora', 'Start laundry', 'laundry', '🧺', 2, 'S', 18),
  ('4c83d488-094d-4143-938b-f8879aeaa09f', 'laundry_hang', 'Tender / meter en secadora', 'Hang / put in dryer', 'laundry', '🧺', 4, 'M', 19),
  ('1f215c0c-f469-4a7f-ae86-ac1c9c48a623', 'laundry_fold', 'Doblar y guardar ropa', 'Fold and put away clothes', 'laundry', '🧺', 4, 'M', 20),
  ('d5602977-999b-4279-aa92-7b772c298789', 'iron', 'Planchar', 'Iron', 'laundry', '🧺', 8, 'L', 21)
ON CONFLICT (key) DO UPDATE SET
  id = EXCLUDED.id,
  name_es = EXCLUDED.name_es,
  name_en = EXCLUDED.name_en,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  default_points = EXCLUDED.default_points,
  default_effort_level = EXCLUDED.default_effort_level,
  sort_order = EXCLUDED.sort_order;
