-- Drop the per-item location.
--
-- Everything on a shelf is on that shelf because of what it is: the spices are in
-- the spice drawer, the frozen things are in the freezer. The category already says
-- where a thing lives, so a free-text location was a second place to record the same
-- fact — and a second place to get it wrong.
--
-- This deletes whatever locations are stored. Skipping it is harmless: the column has
-- a default and nothing writes to it any more.

alter table public.kitchen_items drop column if exists location;
