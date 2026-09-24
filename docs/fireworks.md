# Firework Fund 🎆

Pledge money toward a fireworks show and request the fireworks you want to see. Money
is handled offline — the site tracks pledges and shows receipts for what was
purchased. Served at `/fireworks`.

It is **public**: visitors unlock an event with its passcode rather than an account.
It is therefore its own entry point (`fireworks.html`, code in `src/fireworks/`) rather
than a route inside the signed-in app, which also keeps its `:root`/`body` CSS away from
the rest of the site. It has its own router, mounted with `basename="/fireworks"`;
`vercel.json` sends `/fireworks` and everything under it to `fireworks.html`.

## Pages

Contribute and Receipts are private: visitors must enter an event passcode first. The
passcode identifies the event (each event's passcode is unique) and unlocks both pages
for the browser session.

- **Contribute (`/fireworks`)** — after unlocking: enter your name, amount, and a
  firework request (mortars, comets, parachutes, fountain, other, or buyer's choice —
  the default). Shows the running total and all contributions for the event.
- **Receipts (`/fireworks/receipts`)** — after unlocking: fireworks the organizer
  actually purchased, with pledged vs. spent totals. Once the admin PIN has been
  entered, the add-purchase form appears here too.
- **Admin (`/fireworks/admin`)** — the admin PIN. Create and delete events, delete
  contributions and purchases.

## Admin

Admin is the hexmap's: the same PIN, checked by the same `admin-action` Edge Function
against the same `ADMIN_PIN` secret. The `fireworks_` tables have RLS on and **no
policies**, so neither anonymous visitors nor anyone signed in to the rest of the site
can read or write them directly; the admin screens send the PIN with each request, and
the function does the work with the service-role key (`fireworks_*` actions in
`supabase/functions/admin-action/index.ts`).

The PIN lives in memory for as long as the page is open, and is shared between the
Admin and Receipts pages. A refresh drops it; changing `ADMIN_PIN` locks out every admin
of both apps at once.

(The old project instead allowed any `authenticated` user, which was safe only because
public sign-ups were off. Here anyone can sign in with a magic link, GitHub or Discord.)

## How the event passcode works

Anonymous clients have **no direct table access**. Everything a visitor does goes
through `security definer` Postgres RPCs that validate the passcode server-side on
every call:

- `fireworks_get_event_by_secret(passcode)` — unlock: returns the event's
  name/date/description (never the passcode itself)
- `fireworks_get_contributions(passcode)` / `fireworks_get_purchases(passcode)` —
  private reads
- `fireworks_submit_contribution(passcode, …)` — the only insert path

A wrong passcode raises `INVALID_SECRET` and the UI relocks. The unlocked passcode is
kept in `sessionStorage` for the browser session only.

## Moving it into the shared Supabase project

Everything it owns is prefixed `fireworks_` (the enum too: `firework_type` became
`fireworks_type`), so it can share a project with the cards, the kitchen, Hexcraft
and Hexmap.

1. **Schema.** Run `supabase/migrations/fireworks_0001_init.sql`. It is the old
   `schema.sql` — which already folded in `migrate-001` to `migrate-004` — with the
   prefix and without the admin policies (admin goes through `admin-action`). The
   old files are in the history under `fireworks-import/supabase/`.

2. **Data.** Copy the three tables across, parents first. From the old project:

   ```sh
   pg_dump "$OLD_DB_URL" --data-only --column-inserts \
     -t public.events -t public.contributions -t public.purchases > fireworks-data.sql
   ```

   Rename the tables in the file and make sure the `events` inserts come before the
   other two:

   ```sh
   sed -i -E 's/INSERT INTO public\.(events|contributions|purchases) /INSERT INTO public.fireworks_\1 /' fireworks-data.sql
   ```

   The old `events.created_by` column is gone — nobody signs in any more — so give it
   somewhere to land while loading, then drop it:

   ```sql
   alter table public.fireworks_events add column created_by uuid;
   -- run fireworks-data.sql here (SQL editor, or psql "$NEW_DB_URL" -f fireworks-data.sql)
   alter table public.fireworks_events drop column created_by;
   ```

   (Or export each table to CSV from the old dashboard and import into the prefixed
   table through the new one, leaving out `created_by`.)

   The enum values are unchanged, so `firework_type` columns load as they are.

3. **Redeploy `admin-action`** so it has the `fireworks_*` actions:
   `supabase functions deploy admin-action --no-verify-jwt`. `ADMIN_PIN` is already set
   for the hexmap.

4. **Retire the old deploy** once `/fireworks` shows the old events: the old Vercel
   project and Supabase project are untouched by any of this.
