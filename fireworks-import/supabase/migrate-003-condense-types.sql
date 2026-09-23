-- Condenses firework types to: mortars, comets, parachutes, fountain, other, buyers_choice.
-- Works whether or not migrate-001/002 were run.
-- Existing rows remap: willow/chrysanthemum/brocade/fish -> mortars, comet -> comets,
-- candle(s) -> other (description "candle"), everything else keeps its meaning.
-- Run once in the Supabase SQL editor.

begin;

-- Old submit_contribution signatures go away.
drop function if exists submit_contribution(text, text, numeric, firework_type);
drop function if exists submit_contribution(text, text, numeric, firework_type, text);
drop function if exists submit_contribution(uuid, text, text, numeric, firework_type, text);

-- Bring back the "other" description column (no-op if it still exists).
alter table contributions drop constraint if exists firework_other_required;
alter table contributions add column if not exists firework_other text;

-- Rows that will become 'other' need a description before the constraint lands.
update contributions set firework_other = 'candle'
  where firework_type::text in ('candle', 'candles') and (firework_other is null or trim(firework_other) = '');
update contributions set firework_other = 'unspecified'
  where firework_type::text = 'other' and (firework_other is null or trim(firework_other) = '');

-- Postgres cannot remove enum values: build a new enum and swap.
alter type firework_type rename to firework_type_old;

create type firework_type as enum (
  'mortars', 'comets', 'parachutes', 'fountain', 'other', 'buyers_choice'
);

alter table contributions
  alter column firework_type type firework_type
  using (
    case firework_type::text
      when 'willow' then 'mortars'
      when 'chrysanthemum' then 'mortars'
      when 'brocade' then 'mortars'
      when 'fish' then 'mortars'
      when 'comet' then 'comets'
      when 'candle' then 'other'
      when 'candles' then 'other'
      when 'other' then 'other'
      when 'parachutes' then 'parachutes'
      when 'fountain' then 'fountain'
      else 'buyers_choice'
    end
  )::firework_type;

alter table purchases
  alter column firework_type type firework_type
  using (
    case firework_type::text
      when 'willow' then 'mortars'
      when 'chrysanthemum' then 'mortars'
      when 'brocade' then 'mortars'
      when 'fish' then 'mortars'
      when 'comet' then 'comets'
      when 'candle' then 'other'
      when 'candles' then 'other'
      when 'other' then 'other'
      when 'parachutes' then 'parachutes'
      when 'fountain' then 'fountain'
      else 'buyers_choice'
    end
  )::firework_type;

drop type firework_type_old;

-- "other" requires a description; named types must not have one.
update contributions set firework_other = null where firework_type <> 'other';
alter table contributions add constraint firework_other_required check (
  (firework_type = 'other' and firework_other is not null and length(trim(firework_other)) > 0)
  or (firework_type <> 'other' and firework_other is null)
);

-- Recreate submit_contribution with p_other.
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

grant execute on function submit_contribution to anon, authenticated;

commit;
