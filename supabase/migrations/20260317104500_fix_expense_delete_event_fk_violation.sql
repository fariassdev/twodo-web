-- Fix FK violation when logging delete events after an expense is deleted.
-- In AFTER DELETE triggers, OLD.id no longer exists in public.expenses.
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
    if new.is_shared then
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
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.is_shared then
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
    end if;

    if new.is_shared then
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
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.is_shared then
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
    end if;

    return old;
  end if;

  return null;
end;
$$;
