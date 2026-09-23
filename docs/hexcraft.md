# Hexcraft RPG

Character creator for the Hexcraft RPG system, at `/hexcraft`. It shares this
repository's React app, its Supabase project and its sign-in, so there is nothing
to set up beyond the schema and — if you want skill search — the embeddings.

## Schema

`supabase/migrations/hexcraft_0001_init.sql` enables `pgvector` and creates
`hexcraft_characters`, `hexcraft_skill_embeddings` and the `hexcraft_match_skills`
RPC. Characters belong to the account that made them and RLS enforces it.

## Populating skill embeddings

The skill list is deliberately not in the repository — bring your own and embed it.

1. Put the list in `scripts/hexcraft-skills.txt`, one per line, as
   `Name | optional description`.
2. Set the env vars. The service role key bypasses RLS to write the shared skill
   table, so keep it out of the repository and out of your shell history:

   ```sh
   export OPENAI_API_KEY=...
   export SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   export SUPABASE_SERVICE_ROLE_KEY=...
   ```

3. Run it:

   ```sh
   node scripts/generate-hexcraft-embeddings.mjs
   ```

Without embeddings, skill search returns nothing and custom skills still work.

## Bringing characters over from the old project

Characters used to live in a separate Supabase project, in a `characters` table with
no owner. To move them, export the rows and insert them with your user id:

```sql
insert into public.hexcraft_characters (id, user_id, name, data, created_at, updated_at)
select id, '<your-auth-uid>', name, data, created_at, updated_at
from <the exported rows>;
```

Your auth uid is in the Supabase dashboard under Authentication → Users.
