-- Ensure internal trigger writes to expense_balance_events are not blocked by RLS.
alter function public.log_expense_balance_events() security definer;
