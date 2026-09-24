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
  actually purchased, with pledged vs. spent totals. Organizers also get the
  add-purchase form here.
- **Admin (`/fireworks/admin`)** — organizer sign-in. Create and delete events, delete
  contributions and purchases.

## Organizers

Signing in is by magic link, like the rest of the site — and the session is shared with
the rest of the site, so being signed in is **not** what makes someone an organizer.
The `fireworks_admins` allowlist is: every table policy asks `fireworks_is_admin()`,
and the client asks the same function to decide whether to show the admin screens.
(In the old project the policies allowed any `authenticated` user, which was safe only
because public sign-ups were off. Here anyone can sign in with a magic link, GitHub or
Discord.)

To make someone an organizer, have them sign in once, then in the SQL editor:

```sql
insert into public.fireworks_admins (user_id)
select id from auth.users where email = 'organizer@example.com';
```

Remove them with the matching `delete`. The client can neither read nor change the
table.

Add `https://jaeg.click/fireworks/admin` (and `http://localhost:5173/fireworks/admin`
for development) to Authentication → URL Configuration → Redirect URLs, or the magic
link will land on the site root instead — still signed in, just one click further away.

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
   prefix, the `fireworks_admins` allowlist and the policies rewritten to use it. The
   old files are in the history under `fireworks-import/supabase/`.

2. **Data.** Copy the three tables across, parents first. From the old project:

   ```sh
   pg_dump "$OLD_DB_URL" --data-only --column-inserts \
     -t public.events -t public.contributions -t public.purchases > fireworks-data.sql
   ```

   Rename the tables in the file (`public.events` → `public.fireworks_events`, and so
   on) and make sure the `events` inserts come before the other two. `created_by` points
   at the old project's `auth.users`, which the new project does not have — blank it
   before loading:

   ```sh
   sed -i -E 's/INSERT INTO public\.(events|contributions|purchases) /INSERT INTO public.fireworks_\1 /' fireworks-data.sql
   ```

   then replace each `created_by` uuid in the `fireworks_events` inserts with `NULL`
   (or with your own id in the new project), and run the file in the new project's
   SQL editor or with `psql "$NEW_DB_URL" -f fireworks-data.sql`.

   (Or export each table to CSV from the old dashboard and import into the prefixed
   table through the new one, leaving `created_by` empty.)

   The enum values are unchanged, so `firework_type` columns load as they are.

3. **Organizers.** Add yourself to `fireworks_admins` as above, and the redirect URLs.

4. **Retire the old deploy** once `/fireworks` shows the old events: the old Vercel
   project and Supabase project are untouched by any of this.
