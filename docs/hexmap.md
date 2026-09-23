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

1. **Schema.** Run `supabase/migrations/hexmap_0001_init.sql`, then
   `hexmap_0002_lockdown.sql`, in that order.

   The originals had `create table where not exists` on `hexes` and `quests` — not
   valid SQL, and those two statements would have failed silently in a longer script.
   Fixed here to `if not exists`.

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

4. **The four RPCs that are not in this repository.** The app calls
   `hexmap_create_quest_finding`, `hexmap_purchase_equipment`, `hexmap_save_character`
   and `hexmap_set_quest_active`, but only `join_quest`, `leave_quest`,
   `purchase_shop_item`, `sell_purchase` and `dispose_purchase` were ever committed.
   The other four exist only in the live project. Export them from there, rename each
   to its `hexmap_` form, and create them alongside the rest — otherwise findings,
   equipment purchases, character saves and quest activation will all fail at runtime
   with "function not found".

## Shared session

The client is a re-export of the site's Supabase client rather than a second
connection. Requests are anonymous unless you happen to be signed in to Collections in
the same browser; both work, because the table policies allow public reads and the RPCs
are granted to `anon` and `authenticated` alike.
