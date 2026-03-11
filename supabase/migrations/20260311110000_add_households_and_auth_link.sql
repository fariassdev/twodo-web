-- Add household entities and profile-auth link

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists households_name_unique_ci_idx
  on public.households (lower(name));

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (household_id, profile_id)
);

create unique index if not exists household_members_profile_id_unique_idx
  on public.household_members (profile_id);

create index if not exists household_members_household_id_idx
  on public.household_members (household_id);

alter table public.profiles
  add column if not exists auth_user_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_auth_user_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_auth_user_id_fkey
      foreign key (auth_user_id)
      references auth.users(id)
      on delete set null;
  end if;
end $$;

create unique index if not exists profiles_auth_user_id_unique_idx
  on public.profiles (auth_user_id)
  where auth_user_id is not null;

-- Seed initial household and map current hardcoded profiles.
insert into public.households (name)
select 'Bubis'
where not exists (
  select 1
  from public.households h
  where lower(h.name) = 'bubis'
);

with bubis as (
  select h.id
  from public.households h
  where lower(h.name) = 'bubis'
  limit 1
)
insert into public.household_members (household_id, profile_id, role)
select
  b.id,
  p.id,
  case
    when p.id = 'a1111111-1111-1111-1111-111111111111' then 'admin'
    else 'member'
  end
from bubis b
join public.profiles p
  on p.id in (
    'a1111111-1111-1111-1111-111111111111',
    'b2222222-2222-2222-2222-222222222222'
  )
on conflict (profile_id)
do update set
  household_id = excluded.household_id,
  role = excluded.role;
