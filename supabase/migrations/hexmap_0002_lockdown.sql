-- Lockdown migration: route admin writes through service-role only;
-- expose narrow player operations via security-definer RPC functions.
--
-- Run once in Supabase SQL Editor. Safe to re-run.

-- ============ hexmap_quests ============
drop policy if exists "Allow all access to hexmap_quests" on hexmap_quests;
drop policy if exists "Quests readable by everyone" on hexmap_quests;
create policy "Quests readable by everyone" on hexmap_quests
  for select using (true);
-- No INSERT/UPDATE/DELETE policy for anon. Service role bypasses RLS.

-- RPC: a player joins a quest (appends to players, sets in_progress)
create or replace function hexmap_join_quest(
  p_quest_id uuid,
  p_player_name text,
  p_scheduled_date date default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_players jsonb;
begin
  select players into current_players from hexmap_quests where id = p_quest_id;
  if current_players is null then return; end if;

  if not (current_players ? p_player_name) then
    update hexmap_quests
    set
      players = current_players || to_jsonb(p_player_name),
      status = 'in_progress',
      scheduled_date = coalesce(p_scheduled_date, scheduled_date)
    where id = p_quest_id;
  end if;
end;
$$;
grant execute on function hexmap_join_quest(uuid, text, date) to anon, authenticated;

-- RPC: a player leaves a quest (resets to available if last one out)
create or replace function hexmap_leave_quest(
  p_quest_id uuid,
  p_player_name text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_players jsonb;
  remaining jsonb;
begin
  select players into current_players from hexmap_quests where id = p_quest_id;
  if current_players is null then return; end if;

  select coalesce(jsonb_agg(p), '[]'::jsonb) into remaining
  from jsonb_array_elements_text(current_players) as t(p)
  where p <> p_player_name;

  if jsonb_array_length(remaining) = 0 then
    update hexmap_quests
    set players = remaining, status = 'available', scheduled_date = null
    where id = p_quest_id;
  else
    update hexmap_quests set players = remaining where id = p_quest_id;
  end if;
end;
$$;
grant execute on function hexmap_leave_quest(uuid, text) to anon, authenticated;

-- ============ hexmap_initiative_tracker ============
-- Read open, INSERT open (player adds self, admin adds creatures), but
-- UPDATE/DELETE locked. Admin HP/remove/clear go through admin-action.
drop policy if exists "Allow all access to hexmap_initiative_tracker" on hexmap_initiative_tracker;
drop policy if exists "Initiative readable by everyone" on hexmap_initiative_tracker;
drop policy if exists "Initiative insert open" on hexmap_initiative_tracker;
create policy "Initiative readable by everyone" on hexmap_initiative_tracker
  for select using (true);
create policy "Initiative insert open" on hexmap_initiative_tracker
  for insert with check (true);

-- ============ hexmap_shop_inventory ============
drop policy if exists "Allow all access to hexmap_shop_inventory" on hexmap_shop_inventory;
drop policy if exists "Shop inventory readable" on hexmap_shop_inventory;
create policy "Shop inventory readable" on hexmap_shop_inventory
  for select using (true);
-- No writes for anon.

-- RPC: a player purchases an item (decrement qty or delete if last one)
create or replace function hexmap_purchase_shop_item(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_qty int;
begin
  select quantity into current_qty from hexmap_shop_inventory where id = p_id;
  if current_qty is null then return; end if;

  if current_qty > 1 then
    update hexmap_shop_inventory set quantity = quantity - 1 where id = p_id;
  else
    delete from hexmap_shop_inventory where id = p_id;
  end if;
end;
$$;
grant execute on function hexmap_purchase_shop_item(uuid) to anon, authenticated;

-- ============ hexmap_shop_restock_rules ============
drop policy if exists "Allow all access to hexmap_shop_restock_rules" on hexmap_shop_restock_rules;
drop policy if exists "Restock rules readable" on hexmap_shop_restock_rules;
create policy "Restock rules readable" on hexmap_shop_restock_rules
  for select using (true);
-- No writes for anon.

-- ============ hexmap_shop_restock_settings ============
drop policy if exists "Allow all access to hexmap_shop_restock_settings" on hexmap_shop_restock_settings;
drop policy if exists "Restock settings readable" on hexmap_shop_restock_settings;
create policy "Restock settings readable" on hexmap_shop_restock_settings
  for select using (true);
-- No writes for anon.

-- ============ hexmap_shop_purchases: player sell / dispose ============
-- RPC: a player sells one of their purchased items back for 75% of its gp
-- price. Credits the buyer's character gold and removes the purchase.
-- Returns the gp credited. Only the item's owner may sell it.
create or replace function hexmap_sell_purchase(p_id uuid, p_player text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price text;
  v_buyer text;
  v_value int;
  v_credit int;
begin
  select price, buyer into v_price, v_buyer from hexmap_shop_purchases where id = p_id;
  if v_buyer is null or v_buyer <> p_player then
    return 0;
  end if;

  -- Parse the numeric gp value out of the price string ("1,200 gp" -> 1200);
  -- non-numeric prices ("Priceless", "—") sell for 0.
  v_value := coalesce(nullif(regexp_replace(coalesce(v_price, ''), '[^0-9]', '', 'g'), '')::int, 0);
  v_credit := floor(v_value * 0.75);

  update hexmap_characters set gold = gold + v_credit where player_name = p_player;
  delete from hexmap_shop_purchases where id = p_id;
  return v_credit;
end;
$$;
grant execute on function hexmap_sell_purchase(uuid, text) to anon, authenticated;

-- RPC: a player disposes of one of their purchased items (no gold back).
-- Only the item's owner may dispose it.
create or replace function hexmap_dispose_purchase(p_id uuid, p_player text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer text;
begin
  select buyer into v_buyer from hexmap_shop_purchases where id = p_id;
  if v_buyer is null or v_buyer <> p_player then
    return;
  end if;
  delete from hexmap_shop_purchases where id = p_id;
end;
$$;
grant execute on function hexmap_dispose_purchase(uuid, text) to anon, authenticated;
