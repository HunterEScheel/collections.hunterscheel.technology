-- Adds the 'comet' firework type to an existing database.
-- Run once in the Supabase SQL editor (after migrate-001).

alter type firework_type add value if not exists 'comet' before 'parachutes';
