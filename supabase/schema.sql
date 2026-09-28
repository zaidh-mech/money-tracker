create table if not exists public.money_tracker_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  tracker_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.money_tracker_state enable row level security;
revoke all on table public.money_tracker_state from anon;
grant select, insert, update on table public.money_tracker_state to authenticated;

drop policy if exists "Users can read their own tracker" on public.money_tracker_state;
create policy "Users can read their own tracker"
  on public.money_tracker_state for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own tracker" on public.money_tracker_state;
create policy "Users can create their own tracker"
  on public.money_tracker_state for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own tracker" on public.money_tracker_state;
create policy "Users can update their own tracker"
  on public.money_tracker_state for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'money_tracker_state'
     ) then
    alter publication supabase_realtime add table public.money_tracker_state;
  end if;
end
$$;
