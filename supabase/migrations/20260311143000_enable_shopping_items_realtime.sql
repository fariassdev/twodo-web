-- Ensure shopping_items emits realtime events for household-scoped subscriptions.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'shopping_items'
  ) then
    alter publication supabase_realtime add table public.shopping_items;
  end if;
end
$$;

-- Needed so DELETE events can be filtered by household_id in realtime subscriptions.
alter table public.shopping_items replica identity full;
