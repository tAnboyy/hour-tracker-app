-- Multi-platform foundation. Additive only: existing hour_logs rows and policies remain intact.

alter table public.hour_logs
  add column if not exists version bigint not null default 1;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  timezone text not null,
  tracking_start_date date not null,
  onboarding_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  start_hour smallint not null check (start_hour between 0 and 23),
  end_hour smallint not null check (end_hour between 1 and 24 and end_hour > start_hour),
  active_days smallint[] not null check (cardinality(active_days) > 0),
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.hour_plans (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null,
  date date not null,
  hour smallint not null check (hour between 0 and 23),
  goal text not null default '',
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, date, hour)
);

create table if not exists public.processed_mutations (
  user_id uuid not null references auth.users (id) on delete cascade,
  mutation_id uuid not null,
  entity_type text not null check (entity_type in ('hour_log', 'hour_plan', 'user_settings')),
  result jsonb not null,
  processed_at timestamptz not null default now(),
  primary key (user_id, mutation_id)
);

create table if not exists public.sync_conflicts (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  entity_type text not null check (entity_type in ('hour_log', 'hour_plan', 'user_settings')),
  entity_key text not null,
  mutation_id uuid not null,
  expected_version bigint,
  cloud_version bigint not null,
  local_value jsonb not null,
  cloud_value jsonb not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution text check (resolution in ('local', 'cloud')),
  primary key (user_id, id),
  unique (user_id, mutation_id)
);

create table if not exists public.push_subscriptions (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  endpoint text not null,
  p256dh text not null,
  auth_secret text not null,
  user_agent text,
  timezone text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  primary key (user_id, id),
  unique (user_id, endpoint)
);

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.hour_plans enable row level security;
alter table public.processed_mutations enable row level security;
alter table public.sync_conflicts enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own settings" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own plans" on public.hour_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own mutation receipts" on public.processed_mutations
  for select using (auth.uid() = user_id);
create policy "own conflicts" on public.sync_conflicts
  for select using (auth.uid() = user_id);
create policy "resolve own conflicts" on public.sync_conflicts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own push subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.apply_hour_log_mutation(
  p_mutation_id uuid,
  p_expected_version bigint,
  p_log jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.hour_logs%rowtype;
  v_result jsonb;
  v_date text := p_log->>'date';
  v_hour integer := (p_log->>'hour')::integer;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select result into v_result
  from public.processed_mutations
  where user_id = v_user_id and mutation_id = p_mutation_id;
  if found then
    return v_result;
  end if;

  select * into v_existing
  from public.hour_logs
  where user_id = v_user_id and date = v_date and hour = v_hour
  for update;

  if found and (p_expected_version is null or v_existing.version <> p_expected_version) then
    insert into public.sync_conflicts (
      user_id, entity_type, entity_key, mutation_id, expected_version, cloud_version, local_value, cloud_value
    ) values (
      v_user_id, 'hour_log', v_date || ':' || v_hour, p_mutation_id, p_expected_version,
      v_existing.version, p_log, to_jsonb(v_existing)
    );
    v_result := jsonb_build_object('status', 'conflict', 'cloud', to_jsonb(v_existing));
  elsif not found and p_expected_version is not null then
    v_result := jsonb_build_object('status', 'conflict', 'cloud', null);
    insert into public.sync_conflicts (
      user_id, entity_type, entity_key, mutation_id, expected_version, cloud_version, local_value, cloud_value
    ) values (
      v_user_id, 'hour_log', v_date || ':' || v_hour, p_mutation_id, p_expected_version,
      0, p_log, 'null'::jsonb
    );
  else
    insert into public.hour_logs (
      user_id, id, date, hour, did, next, goal, tags, status, backfilled,
      logged_at, updated_at, version
    ) values (
      v_user_id, (p_log->>'id')::uuid, v_date, v_hour,
      coalesce(p_log->>'did', ''), coalesce(p_log->>'next', ''), coalesce(p_log->>'goal', ''),
      coalesce(p_log->>'tags', ''), coalesce(p_log->>'status', 'logged'),
      coalesce((p_log->>'backfilled')::integer, 0),
      coalesce((p_log->>'logged_at')::timestamptz, now()), now(), 1
    )
    on conflict (user_id, date, hour) do update set
      id = excluded.id,
      did = excluded.did,
      next = excluded.next,
      goal = excluded.goal,
      tags = excluded.tags,
      status = excluded.status,
      backfilled = excluded.backfilled,
      updated_at = now(),
      version = public.hour_logs.version + 1;

    select jsonb_build_object('status', 'applied', 'record', to_jsonb(h)) into v_result
    from public.hour_logs h
    where h.user_id = v_user_id and h.date = v_date and h.hour = v_hour;
  end if;

  insert into public.processed_mutations (user_id, mutation_id, entity_type, result)
  values (v_user_id, p_mutation_id, 'hour_log', v_result);
  return v_result;
end;
$$;

revoke all on function public.apply_hour_log_mutation(uuid, bigint, jsonb) from public;
grant execute on function public.apply_hour_log_mutation(uuid, bigint, jsonb) to authenticated;

-- Existing delete_account() cascades through every new user-owned table via auth.users.
