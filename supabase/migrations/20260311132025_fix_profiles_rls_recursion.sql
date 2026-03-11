-- Fix infinite recursion in profiles RLS policy

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
      from public.household_members hm1
      join public.household_members hm2 on hm1.household_id = hm2.household_id
      where hm1.profile_id = public.current_profile_id()
        and hm2.profile_id = profiles.id
    )
  )
);
