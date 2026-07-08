-- Migration for EXISTING databases created from the original schema.
-- Changes firework types: removes 'other' and 'batteries', renames
-- 'candles' -> 'candle', adds 'buyers_choice'; drops the firework_other column.
-- Existing rows: 'candles' -> 'candle', 'batteries'/'other' -> 'buyers_choice'.
-- Run once in the Supabase SQL editor.

begin;

-- Old submit_contribution signature (with p_other) goes away.
drop function if exists submit_contribution(text, text, numeric, firework_type, text);

-- Constraint and column tied to the old 'other' type.
alter table contributions drop constraint if exists firework_other_required;
alter table contributions drop column if exists firework_other;

-- Postgres cannot remove enum values: build a new enum and swap.
alter type firework_type rename to firework_type_old;

create type firework_type as enum (
  'fountain', 'willow', 'chrysanthemum', 'brocade', 'candle',
  'parachutes', 'fish', 'buyers_choice'
);

alter table contributions
  alter column firework_type type firework_type
  using (
    case firework_type::text
      when 'candles' then 'candle'
      when 'batteries' then 'buyers_choice'
      when 'other' then 'buyers_choice'
      else firework_type::text
    end
  )::firework_type;

alter table purchases
  alter column firework_type type firework_type
  using (
    case firework_type::text
      when 'candles' then 'candle'
      when 'batteries' then 'buyers_choice'
      when 'other' then 'buyers_choice'
      else firework_type::text
    end
  )::firework_type;

drop type firework_type_old;

-- Recreate submit_contribution without p_other.
create or replace function submit_contribution(
  p_secret text,
  p_name text,
  p_amount numeric,
  p_type firework_type
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into contributions (event_id, contributor_name, amount, firework_type)
  values (_event_id_for_secret(p_secret), trim(p_name), p_amount, p_type)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function submit_contribution to anon, authenticated;

commit;
