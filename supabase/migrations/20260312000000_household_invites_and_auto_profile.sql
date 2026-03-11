-- 1.1 — Modify link_profile_to_auth_user() to auto-create profiles
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

  -- Already linked?
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

  -- Try to match an existing unlinked profile by email
  update public.profiles p
  set auth_user_id = auth.uid()
  where p.auth_user_id is null
    and lower(coalesce(p.email, '')) = v_email
  returning p.id into v_profile_id;

  -- If no match, auto-create a new profile
  if v_profile_id is null then
    insert into public.profiles (name, email, auth_user_id)
    values (
      split_part(v_email, '@', 1),
      v_email,
      auth.uid()
    )
    returning id into v_profile_id;
  end if;

  return v_profile_id;
end;
$$;

-- 1.2 — Create household_invites table
create table if not exists public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  invite_code text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  invited_email text,
  expires_at timestamptz not null default (now() + interval '3 days'),
  accepted_by uuid references public.profiles(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.household_invites enable row level security;

-- Allow anyone authenticated to look up an invite by code (for join flow)
create policy invites_select_by_code
on public.household_invites
for select
using (auth.uid() is not null);

-- Allow household members to insert invites for their household
create policy invites_insert_own_household
on public.household_invites
for insert
with check (
  public.is_household_member(household_id)
  and created_by = public.current_profile_id()
);

-- Allow updating (accept) if the caller is the one accepting
create policy invites_update_accept
on public.household_invites
for update
using (auth.uid() is not null)
with check (auth.uid() is not null);

-- 1.3 — RPC create_household_and_invite()
create or replace function public.create_household_and_invite()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_household_id uuid;
  v_invite_code text;
  v_expires_at timestamptz;
begin
  v_profile_id := public.current_profile_id();
  if v_profile_id is null then
    raise exception 'Not authenticated or no profile found';
  end if;

  -- Validate caller has no existing household
  if exists (
    select 1 from public.household_members where profile_id = v_profile_id
  ) then
    raise exception 'You already belong to a household';
  end if;

  -- Create household with auto-generated name
  insert into public.households (name)
  values ('household-' || substr(gen_random_uuid()::text, 1, 8))
  returning id into v_household_id;

  -- Add current profile as admin
  insert into public.household_members (household_id, profile_id, role)
  values (v_household_id, v_profile_id, 'admin');

  -- Generate 8-char invite code
  v_invite_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_expires_at := now() + interval '3 days';

  insert into public.household_invites (household_id, invite_code, created_by, expires_at)
  values (v_household_id, v_invite_code, v_profile_id, v_expires_at);

  return jsonb_build_object(
    'household_id', v_household_id,
    'invite_code', v_invite_code,
    'expires_at', v_expires_at
  );
end;
$$;

grant execute on function public.create_household_and_invite() to authenticated;

-- 1.4 — RPC accept_household_invite(p_invite_code)
create or replace function public.accept_household_invite(p_invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_invite record;
  v_member_count int;
begin
  v_profile_id := public.current_profile_id();
  if v_profile_id is null then
    raise exception 'Not authenticated or no profile found';
  end if;

  -- Find the invite
  select * into v_invite
  from public.household_invites
  where invite_code = upper(p_invite_code)
  limit 1;

  if v_invite is null then
    raise exception 'Invite not found';
  end if;

  if v_invite.expires_at < now() then
    raise exception 'Invite has expired';
  end if;

  if v_invite.accepted_by is not null then
    raise exception 'Invite already accepted';
  end if;

  -- Check caller not in another household
  if exists (
    select 1 from public.household_members where profile_id = v_profile_id
  ) then
    raise exception 'You already belong to a household';
  end if;

  -- Check household < 2 members
  select count(*) into v_member_count
  from public.household_members
  where household_id = v_invite.household_id;

  if v_member_count >= 2 then
    raise exception 'Household is already full';
  end if;

  -- Add caller as member
  insert into public.household_members (household_id, profile_id, role)
  values (v_invite.household_id, v_profile_id, 'member');

  -- Mark invite as accepted
  update public.household_invites
  set accepted_by = v_profile_id,
      accepted_at = now()
  where id = v_invite.id;

  return jsonb_build_object(
    'household_id', v_invite.household_id
  );
end;
$$;

grant execute on function public.accept_household_invite(text) to authenticated;

-- 1.5 — RPC get_invite_info(p_invite_code)
create or replace function public.get_invite_info(p_invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
  v_creator record;
  v_member_count int;
begin
  select * into v_invite
  from public.household_invites
  where invite_code = upper(p_invite_code)
  limit 1;

  if v_invite is null then
    return jsonb_build_object('found', false);
  end if;

  select name, avatar_url into v_creator
  from public.profiles
  where id = v_invite.created_by;

  select count(*) into v_member_count
  from public.household_members
  where household_id = v_invite.household_id;

  return jsonb_build_object(
    'found', true,
    'invite_code', v_invite.invite_code,
    'creator_name', v_creator.name,
    'creator_avatar', v_creator.avatar_url,
    'is_expired', v_invite.expires_at < now(),
    'is_accepted', v_invite.accepted_by is not null,
    'member_count', v_member_count,
    'expires_at', v_invite.expires_at
  );
end;
$$;

grant execute on function public.get_invite_info(text) to authenticated;
