-- Hexmap Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)

-- Hexes table
create table if not exists hexmap_hexes (
  col integer not null,
  row integer not null,
  terrain text not null default 'unknown',
  created_at timestamptz default now(),
  primary key (col, row)
);

-- Migration: Add challenge_tier to hexmap_hexes
-- alter table hexmap_hexes add column challenge_tier integer;

-- Migration: Add landmark to hexmap_hexes
-- alter table hexmap_hexes add column if not exists landmark text;

-- Bestiary table (curated terrain assignments for SRD monsters)
create table if not exists hexmap_bestiary (
  index text primary key,
  name text not null,
  type text not null default '',
  size text not null default '',
  cr numeric not null default 0,
  xp integer not null default 0,
  hp integer not null default 0,
  ac integer not null default 10,
  terrains text[] not null default '{}'
);

alter table hexmap_bestiary enable row level security;

create policy "Allow all access to hexmap_bestiary" on hexmap_bestiary
  for all using (true) with check (true);

-- Shop inventory (current stock with quantities)
create table if not exists hexmap_shop_inventory (
  id uuid default gen_random_uuid() primary key,
  item_index text not null,
  item_name text not null,
  rarity text not null default 'common',
  description text not null default '',
  quantity integer not null default 1,
  price text not null default '',
  created_at timestamptz default now()
);

alter table hexmap_shop_inventory enable row level security;
create policy "Allow all access to hexmap_shop_inventory" on hexmap_shop_inventory
  for all using (true) with check (true);

-- Restock rules (admin-configured per-item dice restocking)
create table if not exists hexmap_shop_restock_rules (
  id uuid default gen_random_uuid() primary key,
  item_index text not null unique,
  item_name text not null,
  rarity text not null default 'common',
  dice text not null default '1d4',
  price text not null default '',
  enabled boolean not null default true,
  created_at timestamptz default now()
);

alter table hexmap_shop_restock_rules enable row level security;
create policy "Allow all access to hexmap_shop_restock_rules" on hexmap_shop_restock_rules
  for all using (true) with check (true);

-- Restock settings (rarity counts)
create table if not exists hexmap_shop_restock_settings (
  rarity text primary key,
  count integer not null default 0
);

alter table hexmap_shop_restock_settings enable row level security;
create policy "Allow all access to hexmap_shop_restock_settings" on hexmap_shop_restock_settings
  for all using (true) with check (true);

-- Default restock settings
insert into hexmap_shop_restock_settings (rarity, count) values
  ('common', 100),
  ('uncommon', 15),
  ('rare', 4),
  ('very rare', 0),
  ('legendary', 0)
on conflict (rarity) do nothing;

-- Migration: Add scheduled_date to hexmap_quests
-- alter table hexmap_quests add column scheduled_date date;

-- Migration: Add end hex to hexmap_quests
-- alter table hexmap_quests add column end_hex_col integer;
-- alter table hexmap_quests add column end_hex_row integer;

-- Migration: Add Discord message id to hexmap_quests
-- alter table hexmap_quests add column if not exists discord_message_id text;

-- Migration: Add found-items loot list to hexmap_quests (admin-attached custom items,
-- each optionally assigned to a party member).
-- alter table hexmap_quests add column if not exists found_items jsonb default '[]'::jsonb;

-- Quests table
create table if not exists hexmap_quests (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text default '',
  reward text default '',
  level text not null default 'explore',
  status text not null default 'available',
  hex_col integer not null,
  hex_row integer not null,
  players jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- Quest findings (player-reported observations attached to a completed quest)
create table if not exists hexmap_quest_findings (
  id uuid default gen_random_uuid() primary key,
  quest_id uuid not null references hexmap_quests(id) on delete cascade,
  author text not null,
  hex_col integer not null,
  hex_row integer not null,
  description text not null default '',
  created_at timestamptz default now()
);

alter table hexmap_quest_findings enable row level security;
create policy "Allow all access to hexmap_quest_findings" on hexmap_quest_findings
  for all using (true) with check (true);

-- Initiative tracker (shared turn order for encounters)
create table if not exists hexmap_initiative_tracker (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  initiative integer not null default 0,
  is_creature boolean not null default false,
  hp integer,
  max_hp integer,
  ac integer,
  cr real,
  -- Optional GM-entered stats for custom creatures (attacks,
  -- vulnerabilities/resistances/immunities). Shape: CreatureDetails in the
  -- mobile app (mobile/src/types.ts).
  details jsonb,
  created_at timestamptz default now()
);

alter table hexmap_initiative_tracker enable row level security;
create policy "Allow all access to hexmap_initiative_tracker" on hexmap_initiative_tracker
  for all using (true) with check (true);

-- Enable real-time for tables
alter publication supabase_realtime add table hexmap_hexes;
alter publication supabase_realtime add table hexmap_quests;
alter publication supabase_realtime add table hexmap_initiative_tracker;
alter publication supabase_realtime add table hexmap_quest_findings;

-- Row Level Security
alter table hexmap_hexes enable row level security;
alter table hexmap_quests enable row level security;

-- Hexes: anyone can read, only the admin-action Edge Function (via service role)
-- can write. The old "Allow all access to hexmap_hexes" policy is dropped if present.
drop policy if exists "Allow all access to hexmap_hexes" on hexmap_hexes;
create policy "Allow read for everyone" on hexmap_hexes
  for select using (true);
-- (no insert/update/delete policy = anon role cannot write; service_role bypasses RLS)

create policy "Allow all access to hexmap_quests" on hexmap_quests
  for all using (true) with check (true);
