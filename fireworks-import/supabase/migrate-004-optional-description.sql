-- Allows an optional specific request (firework_other) on ANY firework type,
-- still required for 'other'. Run once in the Supabase SQL editor (after migrate-003).

alter table contributions drop constraint if exists firework_other_required;

alter table contributions add constraint firework_other_required check (
  firework_type <> 'other'
  or (firework_other is not null and length(trim(firework_other)) > 0)
);
