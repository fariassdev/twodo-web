-- Add accent-insensitive search support for expenses using immutable wrapper + RPC.

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

drop trigger if exists set_expense_description_search_on_write on public.expenses;
drop function if exists public.set_expense_description_search();
alter table public.expenses
  drop column if exists description_search;

create or replace function public.f_unaccent(value text)
returns text
language sql
immutable
parallel safe
strict
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, value);
$$;

create index if not exists expenses_description_unaccent_trgm_idx
  on public.expenses
  using gin (public.f_unaccent(lower(coalesce(description, ''))) extensions.gin_trgm_ops);

create or replace function public.search_expenses(
  p_household_id uuid,
  p_search_term text,
  p_category_id uuid default null,
  p_paid_by_profile_id uuid default null,
  p_from_date date default null,
  p_to_date date default null
)
returns setof public.expenses
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with normalized as (
    select nullif(trim(p_search_term), '') as term
  )
  select e.*
  from public.expenses e
  cross join normalized n
  where e.household_id = p_household_id
    and (p_category_id is null or e.category_id = p_category_id)
    and (p_paid_by_profile_id is null or e.paid_by_profile_id = p_paid_by_profile_id)
    and (p_from_date is null or e.expense_date >= p_from_date)
    and (p_to_date is null or e.expense_date <= p_to_date)
    and (
      n.term is null
      or public.f_unaccent(lower(coalesce(e.description, ''))) ilike
        '%' || public.f_unaccent(lower(n.term)) || '%'
    )
  order by e.expense_date desc, e.created_at desc;
$$;
