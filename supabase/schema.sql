-- Firework Fund schema
-- Run this in the Supabase SQL editor (or via supabase db push).
-- If you ran an earlier version, drop those objects first (fresh project: just run as-is).

-- ============================================================
-- Enum
-- ============================================================
create type firework_type as enum (
  'fountain', 'willow', 'chrysanthemum', 'brocade', 'candles',
  'batteries', 'parachutes', 'fish', 'other'
);

-- ============================================================
-- Tables
-- ============================================================
create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date,
  description text,
  -- Passcode contributors use to unlock the event. Unique: the passcode
  -- alone identifies the event. Never exposed to anon (RPC-only access).
  secret text not null unique,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table contributions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  contributor_name text not null,
  amount numeric(10,2) not null check (amount > 0),
  firework_type firework_type not null,
  firework_other text,
  created_at timestamptz not null default now(),
  -- "other" requires a description; named types must not have one
  constraint firework_other_required check (
    (firework_type = 'other' and firework_other is not null and length(trim(firework_other)) > 0)
    or (firework_type <> 'other' and firework_other is null)
  )
);

create table purchases (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  item_name text not null,
  firework_type firework_type,
  cost numeric(10,2) not null check (cost >= 0),
  quantity int not null default 1 check (quantity > 0),
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- RLS: admins (authenticated) only. Anon has NO table access —
-- everything anon does goes through the passcode-checking RPCs below.
-- ============================================================
alter table events enable row level security;
alter table contributions enable row level security;
alter table purchases enable row level security;

create policy "admins read events" on events
  for select to authenticated using (true);
create policy "admins insert events" on events
  for insert to authenticated with check (true);
create policy "admins update events" on events
  for update to authenticated using (true);
create policy "admins delete events" on events
  for delete to authenticated using (true);

create policy "admins read contributions" on contributions
  for select to authenticated using (true);
create policy "admins delete contributions" on contributions
  for delete to authenticated using (true);

create policy "admins read purchases" on purchases
  for select to authenticated using (true);
create policy "admins insert purchases" on purchases
  for insert to authenticated with check (true);
create policy "admins update purchases" on purchases
  for update to authenticated using (true);
create policy "admins delete purchases" on purchases
  for delete to authenticated using (true);

-- ============================================================
-- Helper: resolve a passcode to its event id (raises on miss)
-- ============================================================
create or replace function _event_id_for_secret(p_secret text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id from events where secret = p_secret;
  if v_id is null then
    raise exception 'INVALID_SECRET';
  end if;
  return v_id;
end;
$$;

revoke execute on function _event_id_for_secret from public, anon, authenticated;

-- ============================================================
-- RPCs: the only anon surface. Each takes the event passcode.
-- ============================================================

-- Unlock: passcode -> event details (no secret column returned)
create or replace function get_event_by_secret(p_secret text)
returns table (id uuid, name text, event_date date, description text)
language sql
security definer
set search_path = public
as $$
  select e.id, e.name, e.event_date, e.description
  from events e
  where e.secret = p_secret;
$$;

create or replace function get_contributions(p_secret text)
returns setof contributions
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select c.* from contributions c
    where c.event_id = _event_id_for_secret(p_secret)
    order by c.created_at desc;
end;
$$;

create or replace function get_purchases(p_secret text)
returns setof purchases
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select p.* from purchases p
    where p.event_id = _event_id_for_secret(p_secret)
    order by p.created_at desc;
end;
$$;

create or replace function submit_contribution(
  p_secret text,
  p_name text,
  p_amount numeric,
  p_type firework_type,
  p_other text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into contributions (event_id, contributor_name, amount, firework_type, firework_other)
  values (
    _event_id_for_secret(p_secret),
    trim(p_name),
    p_amount,
    p_type,
    nullif(trim(coalesce(p_other, '')), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function get_event_by_secret to anon, authenticated;
grant execute on function get_contributions to anon, authenticated;
grant execute on function get_purchases to anon, authenticated;
grant execute on function submit_contribution to anon, authenticated;
