-- The last of the commented-out ALTERs.
--
-- `supabase-schema.sql` carried seven `-- alter table ... add column` lines that had
-- been applied to the live database but never uncommented. 0003 caught six of them by
-- reading what the client maps; this one only ever appears in the Edge Functions,
-- which post a quest to Discord and keep the message id so they can edit that message
-- later instead of posting again. Exporting the live quests table therefore produces a
-- CSV with a column the new table did not have.

alter table hexmap_quests add column if not exists discord_message_id text;
