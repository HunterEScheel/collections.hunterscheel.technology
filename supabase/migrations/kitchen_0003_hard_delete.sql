-- Delete for real.
--
-- `deleted_at` existed so a second client could pull a deletion rather than watch a
-- row silently vanish. With one client there is nobody to tell, and a table full of
-- rows that every query has to remember to hide is a bug waiting to happen.
--
-- Anything already soft-deleted is removed first: dropping the column without that
-- would bring every one of those rows back to life.

delete from public.kitchen_items where deleted_at is not null;
delete from public.kitchen_recipes where deleted_at is not null;

alter table public.kitchen_items drop column if exists deleted_at;
alter table public.kitchen_recipes drop column if exists deleted_at;
