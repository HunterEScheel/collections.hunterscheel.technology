-- purchaseItem() calls hexmap_purchase_shop_item(p_id, p_buyer), but the function
-- committed in hexmap_0002_lockdown.sql only takes p_id. PostgREST resolves an RPC
-- by argument name, so every shop purchase failed with "Could not find the function
-- ... (p_buyer, p_id) in the schema cache". The buyer was never recorded either,
-- even though hexmap_shop_purchases exists to hold exactly that.

drop function if exists hexmap_purchase_shop_item(uuid);

create or replace function hexmap_purchase_shop_item(p_id uuid, p_buyer text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item hexmap_shop_inventory%rowtype;
begin
  -- Lock the row so two players buying the last one cannot both succeed.
  select * into item from hexmap_shop_inventory where id = p_id for update;
  if not found then return; end if;

  if item.quantity > 1 then
    update hexmap_shop_inventory set quantity = quantity - 1 where id = p_id;
  else
    delete from hexmap_shop_inventory where id = p_id;
  end if;

  -- buyer is not null on the table, and an anonymous purchase is still a purchase.
  insert into hexmap_shop_purchases (item_index, item_name, rarity, price, description, buyer)
  values (item.item_index, item.item_name, item.rarity, item.price, item.description,
          coalesce(nullif(trim(p_buyer), ''), 'Unknown'));
end;
$$;

grant execute on function hexmap_purchase_shop_item(uuid, text) to anon, authenticated;
