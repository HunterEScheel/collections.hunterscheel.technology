# Hexmap

D&D hexploration campaign companion — shared Supabase backend with two clients.

## Layout

| Directory | What |
|---|---|
| `web/` | React + Vite web app (map, quests, shop, initiative tracker). Deployed to GitHub Pages on push to `main`. |
| `mobile/` | Android companion app (bare React Native). Floating combat-tracker overlay that syncs live with the same backend. See [mobile/README.md](mobile/README.md). |
| `supabase/` | Edge Functions (admin-action, quest generation, Discord sync). |
| `supabase-schema.sql`, `supabase-lockdown.sql` | Database schema and RLS policies. |

## Quick start

Web:

```bash
cd web && npm install && npm run dev
```

Android (device connected):

```bash
cd mobile && npm install && cd android && ./gradlew installRelease
```

Both clients read Supabase URL + publishable key from env files:
`web/.env.local` (`VITE_`-prefixed) and `mobile/.env`.
