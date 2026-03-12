-- swap_tasks: atomically reassign two tasks between household members.
-- My task gets assigned to partner, partner's task gets assigned to me.
-- Validates household scope and basic eligibility on both tasks.
create or replace function public.swap_tasks(
  p_my_task_id    uuid,
  p_partner_task_id uuid,
  p_my_profile_id uuid,
  p_partner_profile_id uuid,
  p_household_id  uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_my_assignment_type text;
  v_my_assigned_to     uuid;
  v_my_status          text;
  v_my_deleted_at      timestamptz;
  v_pt_assignment_type text;
  v_pt_assigned_to     uuid;
  v_pt_status          text;
  v_pt_deleted_at      timestamptz;
begin
  -- Load and lock both rows in a consistent order to avoid deadlocks
  select assignment_type, assigned_to, status, deleted_at
    into v_my_assignment_type, v_my_assigned_to, v_my_status, v_my_deleted_at
    from public.tasks
   where id = p_my_task_id
     and household_id = p_household_id
   for update;

  if not found then
    raise exception 'my_task_not_found';
  end if;

  select assignment_type, assigned_to, status, deleted_at
    into v_pt_assignment_type, v_pt_assigned_to, v_pt_status, v_pt_deleted_at
    from public.tasks
   where id = p_partner_task_id
     and household_id = p_household_id
   for update;

  if not found then
    raise exception 'partner_task_not_found';
  end if;

  -- Eligibility guards
  if v_my_deleted_at is not null then
    raise exception 'my_task_deleted';
  end if;
  if v_pt_deleted_at is not null then
    raise exception 'partner_task_deleted';
  end if;
  if v_my_status not in ('pending', 'postponed') then
    raise exception 'my_task_not_swappable';
  end if;
  if v_pt_status not in ('pending', 'postponed') then
    raise exception 'partner_task_not_swappable';
  end if;
  if v_my_assignment_type not in ('individual', 'strict_rotation') then
    raise exception 'my_task_wrong_type';
  end if;
  if v_pt_assignment_type not in ('individual', 'strict_rotation') then
    raise exception 'partner_task_wrong_type';
  end if;
  -- Confirm actual ownership
  if v_my_assigned_to is distinct from p_my_profile_id then
    raise exception 'my_task_not_assigned_to_me';
  end if;
  if v_pt_assigned_to is distinct from p_partner_profile_id then
    raise exception 'partner_task_not_assigned_to_partner';
  end if;

  -- Atomic swap of assigned_to
  update public.tasks
     set assigned_to = p_partner_profile_id,
         updated_at  = now()
   where id = p_my_task_id
     and household_id = p_household_id;

  update public.tasks
     set assigned_to = p_my_profile_id,
         updated_at  = now()
   where id = p_partner_task_id
     and household_id = p_household_id;
end;
$$;

-- Revoke public direct call; only authenticated users via service role / RLS context
revoke all on function public.swap_tasks(uuid, uuid, uuid, uuid, uuid) from public;
grant execute on function public.swap_tasks(uuid, uuid, uuid, uuid, uuid) to authenticated;
