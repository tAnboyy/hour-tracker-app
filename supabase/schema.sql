-- Run this in the Supabase SQL editor to set up sync.
create table if not exists public.hour_logs (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null,
  date text not null,
  hour integer not null,
  did text not null default '',
  next text not null default '',
  goal text not null default '',
  tags text not null default '',
  status text not null default 'logged',
  backfilled integer not null default 0,
  logged_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (user_id, date, hour)
);

create index if not exists hour_logs_updated_idx on public.hour_logs (user_id, updated_at);

alter table public.hour_logs enable row level security;

create policy "own rows" on public.hour_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- In-app account deletion (required by Google Play / Apple when accounts exist).
-- Deleting the auth user cascades to hour_logs via the FK.
create or replace function public.delete_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_account() from anon;
grant execute on function public.delete_account() to authenticated;
