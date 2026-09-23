# Guild Hexmap

Hexploration campaign companion — map, quests, shop and initiative tracker — served at
`/hexmap`.

It is **public**, and deliberately so: players identify themselves by typing a name,
and admin is a PIN checked server-side by the `admin-action` Edge Function rather than
an account. It is therefore its own entry point (`hexmap.html`) rather than a route
inside the signed-in app, which also keeps its 1,165 lines of CSS from reaching the
rest of the site.

## Moving it into the shared Supabase project

Everything it owns is prefixed `hexmap_`, so it can share a project with the cards, the
kitchen and Hexcraft. That prefix is why the move is not a straight copy.

1. **Schema.** Run `hexmap_0001_init.sql`, `hexmap_0002_lockdown.sql`, then
   `hexmap_0003_schema_catchup.sql`, in that order.

   Two things about the originals. They had `create table where not exists` on
   `hexes` and `quests` — not valid SQL; fixed here to `if not exists`. And the
   committed schema had drifted well behind the running database, which is what
   `0003` exists to close:

   | Missing | What |
   |---|---|
   | `characters`, `shop_purchases` | Two whole tables the app reads |
   | `hexes.challenge_tier`, `.landmark`, `.landmark_name` | Two sat in the schema file as commented-out ALTERs; the third was never written down |
   | `quests.end_hex_col`, `.end_hex_row`, `.scheduled_date`, `.completed_at`, `.found_items` | All read by `mapQuest()`; `scheduled_date` is also written by the `join_quest` RPC in 0002, which would have failed against the schema as committed |
   | `create_quest_finding`, `purchase_equipment`, `save_character`, `set_quest_active` | Four RPCs the client calls |

   `0003` is additive and idempotent, so it is equally safe on a fresh project or
   against the live database.

2. **Data.** Copy each table across into its prefixed name, for example:

   ```sql
   insert into public.hexmap_quests select * from <old project's quests>;
   ```

3. **Edge Functions.** Deploy the five in `supabase/functions/`:

   ```sh
   supabase functions deploy admin-action
   supabase functions deploy generate-quests
   supabase functions deploy discord-quest-sync
   supabase functions deploy discord-finding-post
   supabase functions deploy npc-quest-report
   ```

   Their secrets have to be set on the new project too — at minimum `ADMIN_PIN`, plus
   whatever the Discord and quest-generation functions read.

4. **Check the four reconstructed RPCs.** `0003` contains working versions of
   `create_quest_finding`, `purchase_equipment`, `save_character` and
   `set_quest_active`, but they were rebuilt from their call sites — the real
   definitions exist only in the old project. `purchase_equipment` in particular
   moves gold, so read it before trusting it. Dump the originals to compare:

   ```sql
   select p.proname, pg_get_functiondef(p.oid)
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('create_quest_finding', 'purchase_equipment',
                       'save_character', 'set_quest_active');
   ```

   Renaming them to their `hexmap_` form and using the originals is the safer path
   if they differ.

## Realtime

The live-update subscriptions filter on table name (`table: "hexmap_quests"` and so
on), so those names have to match the tables exactly — they are not routed through the
`.from()` calls and will silently stop updating if the two drift apart.

## Shared session

The client is a re-export of the site's Supabase client rather than a second
connection. Requests are anonymous unless you happen to be signed in to Collections in
the same browser; both work, because the table policies allow public reads and the RPCs
are granted to `anon` and `authenticated` alike.
