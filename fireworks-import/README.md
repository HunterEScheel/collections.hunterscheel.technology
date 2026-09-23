# Firework Fund 🎆

Pledge money toward a fireworks show and request the fireworks you want to see. Money is handled offline — this site tracks pledges and shows receipts for what was purchased.

## Pages

Contribute and Receipts are private: visitors must enter an event passcode first. The passcode identifies the event (each event's passcode is unique) and unlocks both pages for the browser session.

- **Contribute (`/`)** — after unlocking: enter your name, amount, and a firework request (mortars, comets, parachutes, fountain, other, or buyer's choice — the default). Shows the running total and all contributions for the event.
- **Receipts (`/receipts`)** — after unlocking: fireworks the organizer actually purchased, with pledged vs. spent totals.
- **Admin (`/admin`)** — organizer sign-in (Supabase Auth). Create events with passcodes and record purchases.

## Setup

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Run [supabase/schema.sql](supabase/schema.sql) in the SQL editor (Database > SQL Editor).
3. Create the admin user: Authentication > Users > Add user (email + password). Disable public signups under Authentication > Sign In / Up.
4. Copy `env.example` to `.env.local` and fill in the project URL and anon key (Settings > API).
5. Install and run:

```sh
npm install
npm run dev
```

## How the event passcode works

Anonymous clients have **no direct table access** — RLS grants tables to authenticated admins only. Everything a visitor does goes through `security definer` Postgres RPCs that validate the passcode server-side on every call:

- `get_event_by_secret(passcode)` — unlock: returns the event's name/date/description (never the passcode itself)
- `get_contributions(passcode)` / `get_purchases(passcode)` — private reads
- `submit_contribution(passcode, …)` — the only insert path

A wrong passcode raises `INVALID_SECRET` and the UI relocks. The unlocked passcode is kept in `sessionStorage` for the browser session only.
