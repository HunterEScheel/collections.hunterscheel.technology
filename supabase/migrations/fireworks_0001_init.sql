-- Firework Fund, moved into the shared project.
--
-- Ported from the old project's schema.sql (which already folded in its four
-- migrate-00x files). Two things changed on the way:
--
--   1. Everything is prefixed fireworks_, so it can sit beside the cards, the
--      kitchen, Hexcraft and Hexmap.
--   2. Admin is the hexmap's PIN, not an account. The old policies granted every
--      table to any `authenticated` user, which was fine when the only account was
--      the organizer's. Here anyone can sign in to the site, so there are no table
--      policies at all: admin reads and writes go through the `admin-action` Edge
--      Function, which checks ADMIN_PIN and uses the service-role key.
--
-- Visitors never touch a table either: everything they do goes through the
-- passcode-checking RPCs at the bottom.

-- ============================================================
-- Enum
-- ============================================================
create type public.fireworks_type as enum (
  'mortars', 'comets', 'parachutes', 'fountain', 'other', 'buyers_choice'
);

-- ============================================================
-- Tables
-- ============================================================
create table public.fireworks_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date,
  description text,
  -- Passcode contributors use to unlock the event. Unique: the passcode alone
  -- identifies the event. Never exposed to anon (RPC-only access).
  secret text not null unique,
  created_at timestamptz not null default now()
);

create table public.fireworks_contributions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.fireworks_events(id) on delete cascade,
  contributor_name text not null,
  amount numeric(10,2) not null check (amount > 0),
  firework_type public.fireworks_type not null,
  firework_other text, -- optional specific request (e.g. "willows"); required for 'other'
  created_at timestamptz not null default now(),
  constraint fireworks_other_required check (
    firework_type <> 'other'
    or (firework_other is not null and length(trim(firework_other)) > 0)
  )
);

create table public.fireworks_purchases (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.fireworks_events(id) on delete cascade,
  item_name text not null,
  firework_type public.fireworks_type,
  cost numeric(10,2) not null check (cost >= 0), -- per unit; line total = cost * quantity
  quantity int not null default 1 check (quantity > 0),
  notes text,
  created_at timestamptz not null default now()
);

create index fireworks_contributions_event_idx on public.fireworks_contributions (event_id);
create index fireworks_purchases_event_idx on public.fireworks_purchases (event_id);

-- ============================================================
-- RLS on, no policies: neither anon nor authenticated can reach the tables.
-- Admin goes through `admin-action` (service role); visitors through the RPCs.
-- ============================================================
alter table public.fireworks_events enable row level security;
alter table public.fireworks_contributions enable row level security;
alter table public.fireworks_purchases enable row level security;

-- ============================================================
-- Helper: resolve a passcode to its event id (raises on miss)
-- ============================================================
create or replace function public._fireworks_event_id_for_secret(p_secret text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.fireworks_events where secret = p_secret;
  if v_id is null then
    raise exception 'INVALID_SECRET';
  end if;
  return v_id;
end;
$$;

revoke execute on function public._fireworks_event_id_for_secret from public, anon, authenticated;

-- ============================================================
-- RPCs: the only anon surface. Each takes the event passcode.
-- ============================================================

-- Unlock: passcode -> event details (no secret column returned)
create or replace function public.fireworks_get_event_by_secret(p_secret text)
returns table (id uuid, name text, event_date date, description text)
language sql
security definer
set search_path = public
as $$
  select e.id, e.name, e.event_date, e.description
  from public.fireworks_events e
  where e.secret = p_secret;
$$;

create or replace function public.fireworks_get_contributions(p_secret text)
returns setof public.fireworks_contributions
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select c.* from public.fireworks_contributions c
    where c.event_id = public._fireworks_event_id_for_secret(p_secret)
    order by c.created_at desc;
end;
$$;

create or replace function public.fireworks_get_purchases(p_secret text)
returns setof public.fireworks_purchases
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select p.* from public.fireworks_purchases p
    where p.event_id = public._fireworks_event_id_for_secret(p_secret)
    order by p.created_at desc;
end;
$$;

create or replace function public.fireworks_submit_contribution(
  p_secret text,
  p_name text,
  p_amount numeric,
  p_type public.fireworks_type,
  p_other text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.fireworks_contributions (event_id, contributor_name, amount, firework_type, firework_other)
  values (
    public._fireworks_event_id_for_secret(p_secret),
    trim(p_name),
    p_amount,
    p_type,
    nullif(trim(coalesce(p_other, '')), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.fireworks_get_event_by_secret to anon, authenticated;
grant execute on function public.fireworks_get_contributions to anon, authenticated;
grant execute on function public.fireworks_get_purchases to anon, authenticated;
grant execute on function public.fireworks_submit_contribution to anon, authenticated;
