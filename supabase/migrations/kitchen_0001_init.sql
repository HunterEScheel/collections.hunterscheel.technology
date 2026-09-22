-- My Kitchen: pantry and recipe tables.
--
-- These live in the SAME Supabase project as mtg-collection-search, so one login
-- covers both apps. Everything here is prefixed `kitchen_` and every migration file
-- is prefixed `kitchen_`, so the two repositories can push to one project without
-- colliding on table names or migration numbers.
--
-- Sync model: the Android client owns the row ids (it generates the uuid), so an
-- upsert is idempotent and no id has to be handed back. `updated_at` is stamped by
-- the server on every write, which makes it a safe pull cursor regardless of what
-- the phone thinks the time is. Deletes are soft (`deleted_at`) so they propagate
-- to other devices instead of silently reappearing.

create table if not exists public.kitchen_items (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'OTHER',
  quantity double precision not null default 0,
  unit text not null default 'PIECES',
  low_threshold double precision not null default 0,
  step double precision not null default 0,
  location text not null default '',
  -- Epoch day, matching the client. Null means it does not expire.
  expires_on integer,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Ingredients ride along as jsonb: they are only ever read and written together
-- with their recipe, never queried on their own, and one row per recipe keeps the
-- sync a single upsert instead of a diff.
create table if not exists public.kitchen_recipes (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  servings integer not null default 2,
  notes text not null default '',
  planned boolean not null default false,
  ingredients jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- The pull cursor is (user_id, updated_at), so index it.
create index if not exists kitchen_items_user_updated_idx
  on public.kitchen_items (user_id, updated_at);
create index if not exists kitchen_recipes_user_updated_idx
  on public.kitchen_recipes (user_id, updated_at);

-- Server-stamped updated_at: a client clock must never be able to poison the cursor.
create or replace function public.kitchen_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists kitchen_items_touch on public.kitchen_items;
create trigger kitchen_items_touch
  before insert or update on public.kitchen_items
  for each row execute function public.kitchen_touch_updated_at();

drop trigger if exists kitchen_recipes_touch on public.kitchen_recipes;
create trigger kitchen_recipes_touch
  before insert or update on public.kitchen_recipes
  for each row execute function public.kitchen_touch_updated_at();

-- RLS
alter table public.kitchen_items enable row level security;
alter table public.kitchen_recipes enable row level security;

create policy "kitchen_items select own" on public.kitchen_items
  for select using (auth.uid() = user_id);
create policy "kitchen_items insert own" on public.kitchen_items
  for insert with check (auth.uid() = user_id);
create policy "kitchen_items update own" on public.kitchen_items
  for update using (auth.uid() = user_id);
create policy "kitchen_items delete own" on public.kitchen_items
  for delete using (auth.uid() = user_id);

create policy "kitchen_recipes select own" on public.kitchen_recipes
  for select using (auth.uid() = user_id);
create policy "kitchen_recipes insert own" on public.kitchen_recipes
  for insert with check (auth.uid() = user_id);
create policy "kitchen_recipes update own" on public.kitchen_recipes
  for update using (auth.uid() = user_id);
create policy "kitchen_recipes delete own" on public.kitchen_recipes
  for delete using (auth.uid() = user_id);
