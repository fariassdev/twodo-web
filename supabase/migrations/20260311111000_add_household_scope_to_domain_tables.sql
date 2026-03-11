-- Add household_id to domain tables and backfill existing records.

alter table public.tasks
  add column if not exists household_id uuid;

alter table public.shopping_items
  add column if not exists household_id uuid;

alter table public.love_notes
  add column if not exists household_id uuid;

alter table public.kudos
  add column if not exists household_id uuid;

alter table public.task_completions
  add column if not exists household_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_household_id_fkey') then
    alter table public.tasks
      add constraint tasks_household_id_fkey
      foreign key (household_id)
      references public.households(id)
      on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'shopping_items_household_id_fkey') then
    alter table public.shopping_items
      add constraint shopping_items_household_id_fkey
      foreign key (household_id)
      references public.households(id)
      on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'love_notes_household_id_fkey') then
    alter table public.love_notes
      add constraint love_notes_household_id_fkey
      foreign key (household_id)
      references public.households(id)
      on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'kudos_household_id_fkey') then
    alter table public.kudos
      add constraint kudos_household_id_fkey
      foreign key (household_id)
      references public.households(id)
      on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'task_completions_household_id_fkey') then
    alter table public.task_completions
      add constraint task_completions_household_id_fkey
      foreign key (household_id)
      references public.households(id)
      on delete cascade;
  end if;
end $$;

create index if not exists tasks_household_id_idx
  on public.tasks (household_id);

create index if not exists shopping_items_household_id_idx
  on public.shopping_items (household_id);

create index if not exists love_notes_household_id_idx
  on public.love_notes (household_id);

create index if not exists kudos_household_id_idx
  on public.kudos (household_id);

create index if not exists task_completions_household_id_idx
  on public.task_completions (household_id);

-- Backfill from profile ownership.
update public.tasks t
set household_id = hm.household_id
from public.household_members hm
where t.household_id is null
  and hm.profile_id = coalesce(t.created_by, t.assigned_to, t.last_done_by);

update public.shopping_items s
set household_id = hm.household_id
from public.household_members hm
where s.household_id is null
  and hm.profile_id = s.added_by;

update public.love_notes ln
set household_id = hm.household_id
from public.household_members hm
where ln.household_id is null
  and hm.profile_id = coalesce(ln.from_profile, ln.to_profile);

update public.kudos k
set household_id = hm.household_id
from public.household_members hm
where k.household_id is null
  and hm.profile_id = coalesce(k.from_profile, k.to_profile);

update public.task_completions tc
set household_id = hm.household_id
from public.household_members hm
where tc.household_id is null
  and hm.profile_id = tc.completed_by;

-- Fallback task completions to their task household.
update public.task_completions tc
set household_id = t.household_id
from public.tasks t
where tc.household_id is null
  and t.id = tc.task_id
  and t.household_id is not null;

-- Fallback to Bubis for any remaining legacy rows.
with bubis as (
  select h.id
  from public.households h
  where lower(h.name) = 'bubis'
  limit 1
)
update public.tasks t
set household_id = b.id
from bubis b
where t.household_id is null;

with bubis as (
  select h.id
  from public.households h
  where lower(h.name) = 'bubis'
  limit 1
)
update public.shopping_items s
set household_id = b.id
from bubis b
where s.household_id is null;

with bubis as (
  select h.id
  from public.households h
  where lower(h.name) = 'bubis'
  limit 1
)
update public.love_notes ln
set household_id = b.id
from bubis b
where ln.household_id is null;

with bubis as (
  select h.id
  from public.households h
  where lower(h.name) = 'bubis'
  limit 1
)
update public.kudos k
set household_id = b.id
from bubis b
where k.household_id is null;

with bubis as (
  select h.id
  from public.households h
  where lower(h.name) = 'bubis'
  limit 1
)
update public.task_completions tc
set household_id = b.id
from bubis b
where tc.household_id is null;

alter table public.tasks
  alter column household_id set not null;

alter table public.shopping_items
  alter column household_id set not null;

alter table public.love_notes
  alter column household_id set not null;

alter table public.kudos
  alter column household_id set not null;

alter table public.task_completions
  alter column household_id set not null;
