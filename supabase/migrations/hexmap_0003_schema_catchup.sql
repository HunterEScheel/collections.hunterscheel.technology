-- Hexmap: what the committed schema never had.
--
-- `supabase-schema.sql` in the original repository had drifted behind the running
-- database. Two whole tables the app reads were missing, five columns had been
-- added live (two of them sitting in that file as commented-out ALTERs), and four
-- of the RPCs the client calls were never committed at all.
--
-- Everything here is additive and idempotent, so it works either way: run it after
-- 0001/0002 on a fresh project, or against the live database to bring it level.
--
-- The four functions at the bottom are RECONSTRUCTED from their call sites, not
-- copied from the original — those definitions exist only in the old project. Dump
-- the real ones before trusting these:
--
--   select p.proname, pg_get_functiondef(p.oid)
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public'
--     and p.proname in ('create_quest_finding', 'purchase_equipment',
--                       'save_character', 'set_quest_active');

-- ============ columns added to the live database but never committed ============

-- These two sat in supabase-schema.sql as commented-out migrations; the third was
-- never written down at all. The map reads all three.
alter table hexmap_hexes add column if not exists challenge_tier integer;
alter table hexmap_hexes add column if not exists landmark text;
alter table hexmap_hexes add column if not exists landmark_name text;

-- mapQuest() reads all of these. `scheduled_date` is also written by the
-- join_quest RPC in 0002, which would fail against the schema as committed.
alter table hexmap_quests add column if not exists end_hex_col integer;
alter table hexmap_quests add column if not exists end_hex_row integer;
alter table hexmap_quests add column if not exists scheduled_date date;
alter table hexmap_quests add column if not exists completed_at timestamptz;
alter table hexmap_quests add column if not exists found_items jsonb default '[]'::jsonb;

-- ============ tables the app reads that were never committed ============

-- Player characters, keyed by name: there are no accounts here, a player is who
-- they say they are. Column names come from mapCharacter() and from the gold
-- arithmetic in the sell_purchase RPC.
create table if not exists hexmap_characters (
  player_name text primary key,
  hit_points  integer,
  armor_class integer,
  gold        integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table hexmap_characters enable row level security;
drop policy if exists "Characters readable by everyone" on hexmap_characters;
create policy "Characters readable by everyone" on hexmap_characters
  for select using (true);
-- Writes go through save_character / the gold RPCs / the admin Edge Function.

-- Items a player has bought. Columns come from fetchShopPurchases() and from the
-- sell_purchase and dispose_purchase RPCs in 0002.
create table if not exists hexmap_shop_purchases (
  id           uuid primary key default gen_random_uuid(),
  item_index   text,
  item_name    text not null,
  rarity       text,
  price        text,
  description  text,
  buyer        text not null,
  purchased_at timestamptz not null default now()
);

create index if not exists hexmap_shop_purchases_buyer_idx
  on hexmap_shop_purchases (buyer, purchased_at desc);

alter table hexmap_shop_purchases enable row level security;
drop policy if exists "Purchases readable by everyone" on hexmap_shop_purchases;
create policy "Purchases readable by everyone" on hexmap_shop_purchases
  for select using (true);
-- Writes go through purchase_shop_item / purchase_equipment / sell / dispose.

-- ============ RPCs the client calls that were never committed ============
-- Reconstructed. Compare against the live definitions before relying on them.

-- A player records a finding against a quest they are on. Returns the new id so
-- the client can post it to Discord.
create or replace function hexmap_create_quest_finding(
  p_quest_id uuid,
  p_author text,
  p_hex_col integer,
  p_hex_row integer,
  p_description text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_players jsonb;
  v_id uuid;
begin
  select players into v_players from hexmap_quests where id = p_quest_id;
  if v_players is null then return null; end if;

  -- Only someone on the party may report a finding for it.
  if not (v_players ? p_author) then return null; end if;

  insert into hexmap_quest_findings (quest_id, author, hex_col, hex_row, description)
  values (p_quest_id, p_author, p_hex_col, p_hex_row, left(coalesce(p_description, ''), 4000))
  returning id into v_id;

  return v_id;
end;
$$;
grant execute on function hexmap_create_quest_finding(uuid, text, integer, integer, text)
  to anon, authenticated;

-- Create or rename a character. Renaming carries the row over rather than
-- orphaning it, because the player's name is its only key.
create or replace function hexmap_save_character(
  p_old_name text,
  p_new_name text,
  p_hp integer,
  p_ac integer,
  p_gold integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_new_name is null or btrim(p_new_name) = '' then return; end if;

  if p_old_name is not null and p_old_name <> p_new_name
     and exists (select 1 from hexmap_characters where player_name = p_old_name) then
    update hexmap_characters
    set player_name = p_new_name, hit_points = p_hp, armor_class = p_ac, gold = p_gold
    where player_name = p_old_name;
    return;
  end if;

  insert into hexmap_characters (player_name, hit_points, armor_class, gold)
  values (p_new_name, p_hp, p_ac, coalesce(p_gold, 0))
  on conflict (player_name) do update
  set hit_points = excluded.hit_points,
      armor_class = excluded.armor_class,
      gold = excluded.gold;
end;
$$;
grant execute on function hexmap_save_character(text, text, integer, integer, integer)
  to anon, authenticated;

-- A player picks a quest up as the one they are actively running. Joins them to
-- the party if they are not already on it.
create or replace function hexmap_set_quest_active(
  p_quest_id uuid,
  p_player_name text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_players jsonb;
begin
  select players into v_players from hexmap_quests where id = p_quest_id;
  if v_players is null then return; end if;

  update hexmap_quests
  set players = case when v_players ? p_player_name
                     then v_players
                     else v_players || to_jsonb(p_player_name) end,
      status = 'in_progress'
  where id = p_quest_id;
end;
$$;
grant execute on function hexmap_set_quest_active(uuid, text) to anon, authenticated;

-- A player buys a piece of mundane equipment. Unlike the magic-item shop there is
-- no stock to decrement — the cost is parsed out of the price string the way
-- sell_purchase parses it, the character pays, and the item lands in their
-- purchases. Refuses rather than allowing a character into debt.
create or replace function hexmap_purchase_equipment(
  p_buyer text,
  p_item_index text,
  p_item_name text,
  p_category text,
  p_cost text,
  p_description text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost int;
  v_gold int;
begin
  select gold into v_gold from hexmap_characters where player_name = p_buyer;
  if v_gold is null then return; end if;

  v_cost := coalesce(nullif(regexp_replace(coalesce(p_cost, ''), '[^0-9]', '', 'g'), '')::int, 0);
  if v_gold < v_cost then
    raise exception 'Not enough gold: % has %, needs %', p_buyer, v_gold, v_cost;
  end if;

  update hexmap_characters set gold = gold - v_cost where player_name = p_buyer;

  insert into hexmap_shop_purchases (item_index, item_name, rarity, price, description, buyer)
  values (p_item_index, p_item_name, coalesce(p_category, 'equipment'), p_cost, p_description, p_buyer);
end;
$$;
grant execute on function hexmap_purchase_equipment(text, text, text, text, text, text)
  to anon, authenticated;
