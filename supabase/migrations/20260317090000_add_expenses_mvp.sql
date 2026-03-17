-- Expenses MVP domain: categories, expenses, settlements, and balance events.

create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  name_es text not null,
  name_en text not null,
  icon text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists expense_categories_key_unique_idx
  on public.expense_categories (key);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  paid_by_profile_id uuid not null references public.profiles(id),
  created_by_profile_id uuid not null references public.profiles(id),
  category_id uuid not null references public.expense_categories(id),
  amount_cents integer not null check (amount_cents > 0),
  description text,
  expense_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_household_date_idx
  on public.expenses (household_id, expense_date desc, created_at desc);

create index if not exists expenses_household_paid_by_idx
  on public.expenses (household_id, paid_by_profile_id);

create index if not exists expenses_household_category_idx
  on public.expenses (household_id, category_id);

create table if not exists public.expense_balance_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  expense_id uuid references public.expenses(id) on delete set null,
  event_kind text not null check (
    event_kind in (
      'expense_created',
      'expense_updated_reverse',
      'expense_updated_apply',
      'expense_deleted_reverse'
    )
  ),
  from_profile_id uuid not null references public.profiles(id),
  to_profile_id uuid not null references public.profiles(id),
  amount_cents integer not null check (amount_cents > 0),
  created_at timestamptz not null default now()
);

create index if not exists expense_balance_events_household_created_idx
  on public.expense_balance_events (household_id, created_at desc);

create index if not exists expense_balance_events_household_expense_idx
  on public.expense_balance_events (household_id, expense_id);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  paid_by_profile_id uuid not null references public.profiles(id),
  paid_to_profile_id uuid not null references public.profiles(id),
  created_by_profile_id uuid not null references public.profiles(id),
  amount_cents integer not null check (amount_cents > 0),
  note text,
  settled_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists settlements_household_settled_idx
  on public.settlements (household_id, settled_at desc, created_at desc);

create index if not exists settlements_household_paid_by_idx
  on public.settlements (household_id, paid_by_profile_id);

create or replace function public.calc_shared_half_cents(p_amount_cents integer)
returns integer
language sql
immutable
as $$
  select round((p_amount_cents::numeric) / 2)::integer
$$;

create or replace function public.get_counterparty_profile(
  p_household_id uuid,
  p_profile_id uuid
)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select hm.profile_id
  from public.household_members hm
  where hm.household_id = p_household_id
    and hm.profile_id <> p_profile_id
  order by hm.created_at asc
  limit 1
$$;

create or replace function public.enforce_expense_integrity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.profile_in_household(new.paid_by_profile_id, new.household_id) then
    raise exception 'Expense payer must belong to the same household';
  end if;

  if not public.profile_in_household(new.created_by_profile_id, new.household_id) then
    raise exception 'Expense creator must belong to the same household';
  end if;

  if not exists (
    select 1
    from public.household_members hm
    where hm.household_id = new.household_id
      and hm.profile_id <> new.paid_by_profile_id
  ) then
    raise exception 'Shared expense requires a counterparty in the same household';
  end if;

  return new;
end;
$$;

create or replace function public.set_expense_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.log_expense_balance_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_counterparty uuid;
  v_half_cents integer;
begin
  if tg_op = 'INSERT' then
      v_counterparty := public.get_counterparty_profile(new.household_id, new.paid_by_profile_id);

    if v_counterparty is null then
      raise exception 'Shared expense requires a counterparty profile';
    end if;

    v_half_cents := public.calc_shared_half_cents(new.amount_cents);

    insert into public.expense_balance_events (
      household_id,
      expense_id,
      event_kind,
      from_profile_id,
      to_profile_id,
      amount_cents
    ) values (
      new.household_id,
      new.id,
      'expense_created',
      v_counterparty,
      new.paid_by_profile_id,
      v_half_cents
    );

    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_counterparty := public.get_counterparty_profile(old.household_id, old.paid_by_profile_id);

    if v_counterparty is null then
      raise exception 'Shared expense requires a counterparty profile';
    end if;

    v_half_cents := public.calc_shared_half_cents(old.amount_cents);

    insert into public.expense_balance_events (
      household_id,
      expense_id,
      event_kind,
      from_profile_id,
      to_profile_id,
      amount_cents
    ) values (
      old.household_id,
      old.id,
      'expense_updated_reverse',
      old.paid_by_profile_id,
      v_counterparty,
      v_half_cents
    );

    v_counterparty := public.get_counterparty_profile(new.household_id, new.paid_by_profile_id);

    if v_counterparty is null then
      raise exception 'Shared expense requires a counterparty profile';
    end if;

    v_half_cents := public.calc_shared_half_cents(new.amount_cents);

    insert into public.expense_balance_events (
      household_id,
      expense_id,
      event_kind,
      from_profile_id,
      to_profile_id,
      amount_cents
    ) values (
      new.household_id,
      new.id,
      'expense_updated_apply',
      v_counterparty,
      new.paid_by_profile_id,
      v_half_cents
    );

    return new;
  end if;

  if tg_op = 'DELETE' then
    v_counterparty := public.get_counterparty_profile(old.household_id, old.paid_by_profile_id);

    if v_counterparty is null then
      raise exception 'Shared expense requires a counterparty profile';
    end if;

    v_half_cents := public.calc_shared_half_cents(old.amount_cents);

    insert into public.expense_balance_events (
      household_id,
      expense_id,
      event_kind,
      from_profile_id,
      to_profile_id,
      amount_cents
    ) values (
      old.household_id,
      null,
      'expense_deleted_reverse',
      old.paid_by_profile_id,
      v_counterparty,
      v_half_cents
    );

    return old;
  end if;

  return null;
end;
$$;

create or replace function public.current_balance_cents_since_last_settlement(
  p_household_id uuid,
  p_profile_id uuid
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cutoff timestamptz;
  v_balance integer;
begin
  select max(s.settled_at)
  into v_cutoff
  from public.settlements s
  where s.household_id = p_household_id;

  select coalesce(
    sum(
      case
        when e.to_profile_id = p_profile_id then e.amount_cents
        when e.from_profile_id = p_profile_id then -e.amount_cents
        else 0
      end
    ),
    0
  )
  into v_balance
  from public.expense_balance_events e
  where e.household_id = p_household_id
    and (v_cutoff is null or e.created_at > v_cutoff);

  return v_balance;
end;
$$;

create or replace function public.enforce_settlement_integrity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_member_count integer;
  v_partner_id uuid;
  v_balance integer;
begin
  if not public.profile_in_household(new.paid_by_profile_id, new.household_id) then
    raise exception 'Settlement payer must belong to household';
  end if;

  if not public.profile_in_household(new.paid_to_profile_id, new.household_id) then
    raise exception 'Settlement receiver must belong to household';
  end if;

  if new.paid_by_profile_id = new.paid_to_profile_id then
    raise exception 'Settlement payer and receiver must be different profiles';
  end if;

  select count(*)
  into v_member_count
  from public.household_members hm
  where hm.household_id = new.household_id;

  if v_member_count <> 2 then
    raise exception 'MVP settlements support exactly two household members';
  end if;

  v_partner_id := public.get_counterparty_profile(new.household_id, new.paid_by_profile_id);

  if v_partner_id is null or v_partner_id <> new.paid_to_profile_id then
    raise exception 'Settlement receiver must be the counterparty';
  end if;

  v_balance := public.current_balance_cents_since_last_settlement(
    new.household_id,
    new.paid_by_profile_id
  );

  if v_balance >= 0 then
    raise exception 'Only the member who owes can confirm settlement';
  end if;

  if abs(v_balance) <> new.amount_cents then
    raise exception 'Settlement amount must match current debt';
  end if;

  if new.created_by_profile_id is null then
    new.created_by_profile_id := public.current_profile_id();
  end if;

  if new.created_by_profile_id <> new.paid_by_profile_id then
    raise exception 'Settlement must be created by the paying profile';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_expenses_enforce_integrity on public.expenses;
create trigger trg_expenses_enforce_integrity
before insert or update of household_id, paid_by_profile_id, created_by_profile_id
on public.expenses
for each row
execute function public.enforce_expense_integrity();

drop trigger if exists trg_expenses_updated_at on public.expenses;
create trigger trg_expenses_updated_at
before update
on public.expenses
for each row
execute function public.set_expense_updated_at();

drop trigger if exists trg_expenses_balance_events_insert_update on public.expenses;
create trigger trg_expenses_balance_events_insert_update
after insert or update of household_id, paid_by_profile_id, amount_cents
on public.expenses
for each row
execute function public.log_expense_balance_events();

drop trigger if exists trg_expenses_balance_events_delete on public.expenses;
create trigger trg_expenses_balance_events_delete
after delete
on public.expenses
for each row
execute function public.log_expense_balance_events();

drop trigger if exists trg_settlements_enforce_integrity on public.settlements;
create trigger trg_settlements_enforce_integrity
before insert
on public.settlements
for each row
execute function public.enforce_settlement_integrity();

alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_balance_events enable row level security;
alter table public.settlements enable row level security;

drop policy if exists expense_categories_select on public.expense_categories;
create policy expense_categories_select
on public.expense_categories
for select
using (auth.uid() is not null);

drop policy if exists expenses_select_household on public.expenses;
create policy expenses_select_household
on public.expenses
for select
using (public.is_household_member(household_id));

drop policy if exists expenses_insert_household on public.expenses;
create policy expenses_insert_household
on public.expenses
for insert
with check (
  public.is_household_member(household_id)
  and public.profile_in_household(paid_by_profile_id, household_id)
  and public.profile_in_household(created_by_profile_id, household_id)
);

drop policy if exists expenses_update_household on public.expenses;
create policy expenses_update_household
on public.expenses
for update
using (public.is_household_member(household_id))
with check (
  public.is_household_member(household_id)
  and public.profile_in_household(paid_by_profile_id, household_id)
  and public.profile_in_household(created_by_profile_id, household_id)
);

drop policy if exists expenses_delete_household on public.expenses;
create policy expenses_delete_household
on public.expenses
for delete
using (public.is_household_member(household_id));

drop policy if exists expense_balance_events_select_household on public.expense_balance_events;
create policy expense_balance_events_select_household
on public.expense_balance_events
for select
using (public.is_household_member(household_id));

drop policy if exists settlements_select_household on public.settlements;
create policy settlements_select_household
on public.settlements
for select
using (public.is_household_member(household_id));

drop policy if exists settlements_insert_household on public.settlements;
create policy settlements_insert_household
on public.settlements
for insert
with check (
  public.is_household_member(household_id)
  and public.profile_in_household(paid_by_profile_id, household_id)
  and public.profile_in_household(paid_to_profile_id, household_id)
  and public.profile_in_household(created_by_profile_id, household_id)
  and paid_by_profile_id = public.current_profile_id()
  and created_by_profile_id = public.current_profile_id()
);

insert into public.expense_categories (key, name_es, name_en, icon, sort_order)
values
  ('groceries', 'Supermercado', 'Groceries', 'shopping_cart', 1),
  ('dining', 'Restaurantes', 'Dining out', 'restaurant', 2),
  ('home', 'Hogar', 'Home', 'home', 3),
  ('transport', 'Transporte', 'Transport', 'directions_car', 4),
  ('health', 'Salud', 'Health', 'local_hospital', 5),
  ('entertainment', 'Ocio', 'Entertainment', 'movie', 6),
  ('travel', 'Viajes', 'Travel', 'flight', 7),
  ('subscriptions', 'Suscripciones', 'Subscriptions', 'subscriptions', 8),
  ('gifts', 'Regalos', 'Gifts', 'redeem', 9),
  ('other', 'Otros', 'Other', 'category', 10)
on conflict (key)
do update set
  name_es = excluded.name_es,
  name_en = excluded.name_en,
  icon = excluded.icon,
  sort_order = excluded.sort_order;

grant execute on function public.current_balance_cents_since_last_settlement(uuid, uuid) to authenticated;
