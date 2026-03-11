-- Enable RLS and add household-aware auth helpers.

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  where p.auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.is_household_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    join public.profiles p
      on p.id = hm.profile_id
    where hm.household_id = p_household_id
      and p.auth_user_id = auth.uid()
  )
$$;

create or replace function public.profile_in_household(p_profile_id uuid, p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.profile_id = p_profile_id
  )
$$;

create or replace function public.link_profile_to_auth_user()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile_id uuid;
  v_email text;
begin
  if auth.uid() is null then
    return null;
  end if;

  select p.id
  into v_profile_id
  from public.profiles p
  where p.auth_user_id = auth.uid()
  limit 1;

  if v_profile_id is not null then
    return v_profile_id;
  end if;

  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  if v_email = '' then
    return null;
  end if;

  update public.profiles p
  set auth_user_id = auth.uid()
  where p.auth_user_id is null
    and lower(coalesce(p.email, '')) = v_email
  returning p.id into v_profile_id;

  return v_profile_id;
end;
$$;

grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.profile_in_household(uuid, uuid) to authenticated;
grant execute on function public.link_profile_to_auth_user() to authenticated;

create or replace function public.enforce_task_household_assignment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.assigned_to is not null and not public.profile_in_household(new.assigned_to, new.household_id) then
    raise exception 'Assigned profile must belong to the same household';
  end if;

  if new.created_by is not null and not public.profile_in_household(new.created_by, new.household_id) then
    raise exception 'Creator profile must belong to the same household';
  end if;

  if new.last_done_by is not null and not public.profile_in_household(new.last_done_by, new.household_id) then
    raise exception 'Completer profile must belong to the same household';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tasks_household_assignment on public.tasks;
create trigger trg_tasks_household_assignment
before insert or update of household_id, assigned_to, created_by, last_done_by
on public.tasks
for each row
execute function public.enforce_task_household_assignment();

create or replace function public.enforce_task_completion_household()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.tasks t
    where t.id = new.task_id
      and t.household_id = new.household_id
  ) then
    raise exception 'Task completion household must match task household';
  end if;

  if not public.profile_in_household(new.completed_by, new.household_id) then
    raise exception 'Task completion profile must belong to the same household';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_task_completions_household on public.task_completions;
create trigger trg_task_completions_household
before insert or update of household_id, task_id, completed_by
on public.task_completions
for each row
execute function public.enforce_task_completion_household();

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.shopping_items enable row level security;
alter table public.love_notes enable row level security;
alter table public.kudos enable row level security;
alter table public.task_completions enable row level security;

drop policy if exists households_select on public.households;
create policy households_select
on public.households
for select
using (public.is_household_member(id));

drop policy if exists household_members_select on public.household_members;
create policy household_members_select
on public.household_members
for select
using (public.is_household_member(household_id));

drop policy if exists profiles_select_same_household on public.profiles;
create policy profiles_select_same_household
on public.profiles
for select
using (
  auth.uid() is not null
  and (
    auth_user_id = auth.uid()
    or exists (
      select 1
      from public.household_members me
      join public.profiles my_profile
        on my_profile.id = me.profile_id
      join public.household_members teammate
        on teammate.household_id = me.household_id
      where my_profile.auth_user_id = auth.uid()
        and teammate.profile_id = profiles.id
    )
  )
);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
on public.profiles
for update
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

drop policy if exists tasks_select_household on public.tasks;
create policy tasks_select_household
on public.tasks
for select
using (public.is_household_member(household_id));

drop policy if exists tasks_insert_household on public.tasks;
create policy tasks_insert_household
on public.tasks
for insert
with check (
  public.is_household_member(household_id)
  and (assigned_to is null or public.profile_in_household(assigned_to, household_id))
  and (created_by is null or public.profile_in_household(created_by, household_id))
  and (last_done_by is null or public.profile_in_household(last_done_by, household_id))
);

drop policy if exists tasks_update_household on public.tasks;
create policy tasks_update_household
on public.tasks
for update
using (public.is_household_member(household_id))
with check (
  public.is_household_member(household_id)
  and (assigned_to is null or public.profile_in_household(assigned_to, household_id))
  and (created_by is null or public.profile_in_household(created_by, household_id))
  and (last_done_by is null or public.profile_in_household(last_done_by, household_id))
);

drop policy if exists tasks_delete_household on public.tasks;
create policy tasks_delete_household
on public.tasks
for delete
using (public.is_household_member(household_id));

drop policy if exists shopping_items_select_household on public.shopping_items;
create policy shopping_items_select_household
on public.shopping_items
for select
using (public.is_household_member(household_id));

drop policy if exists shopping_items_insert_household on public.shopping_items;
create policy shopping_items_insert_household
on public.shopping_items
for insert
with check (
  public.is_household_member(household_id)
  and (added_by is null or public.profile_in_household(added_by, household_id))
);

drop policy if exists shopping_items_update_household on public.shopping_items;
create policy shopping_items_update_household
on public.shopping_items
for update
using (public.is_household_member(household_id))
with check (
  public.is_household_member(household_id)
  and (added_by is null or public.profile_in_household(added_by, household_id))
);

drop policy if exists shopping_items_delete_household on public.shopping_items;
create policy shopping_items_delete_household
on public.shopping_items
for delete
using (public.is_household_member(household_id));

drop policy if exists love_notes_select_household on public.love_notes;
create policy love_notes_select_household
on public.love_notes
for select
using (public.is_household_member(household_id));

drop policy if exists love_notes_insert_household on public.love_notes;
create policy love_notes_insert_household
on public.love_notes
for insert
with check (
  public.is_household_member(household_id)
  and public.profile_in_household(from_profile, household_id)
  and public.profile_in_household(to_profile, household_id)
);

drop policy if exists love_notes_update_household on public.love_notes;
create policy love_notes_update_household
on public.love_notes
for update
using (public.is_household_member(household_id))
with check (
  public.is_household_member(household_id)
  and public.profile_in_household(from_profile, household_id)
  and public.profile_in_household(to_profile, household_id)
);

drop policy if exists love_notes_delete_household on public.love_notes;
create policy love_notes_delete_household
on public.love_notes
for delete
using (public.is_household_member(household_id));

drop policy if exists kudos_select_household on public.kudos;
create policy kudos_select_household
on public.kudos
for select
using (public.is_household_member(household_id));

drop policy if exists kudos_insert_household on public.kudos;
create policy kudos_insert_household
on public.kudos
for insert
with check (
  public.is_household_member(household_id)
  and public.profile_in_household(from_profile, household_id)
  and public.profile_in_household(to_profile, household_id)
);

drop policy if exists kudos_update_household on public.kudos;
create policy kudos_update_household
on public.kudos
for update
using (public.is_household_member(household_id))
with check (
  public.is_household_member(household_id)
  and public.profile_in_household(from_profile, household_id)
  and public.profile_in_household(to_profile, household_id)
);

drop policy if exists kudos_delete_household on public.kudos;
create policy kudos_delete_household
on public.kudos
for delete
using (public.is_household_member(household_id));

drop policy if exists task_completions_select_household on public.task_completions;
create policy task_completions_select_household
on public.task_completions
for select
using (public.is_household_member(household_id));

drop policy if exists task_completions_insert_household on public.task_completions;
create policy task_completions_insert_household
on public.task_completions
for insert
with check (
  public.is_household_member(household_id)
  and public.profile_in_household(completed_by, household_id)
  and exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and t.household_id = task_completions.household_id
  )
);

drop policy if exists task_completions_update_household on public.task_completions;
create policy task_completions_update_household
on public.task_completions
for update
using (public.is_household_member(household_id))
with check (
  public.is_household_member(household_id)
  and public.profile_in_household(completed_by, household_id)
  and exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and t.household_id = task_completions.household_id
  )
);

drop policy if exists task_completions_delete_household on public.task_completions;
create policy task_completions_delete_household
on public.task_completions
for delete
using (public.is_household_member(household_id));
