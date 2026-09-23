# Hexcraft RPG

Character creator for the Hexcraft RPG system. React + Vite + Supabase.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- Supabase (Postgres + pgvector) for skill embeddings and saved characters

## Local development

```bash
npm install
cp .env.example .env   # then fill in Supabase URL + anon key
npm run dev
```

The app degrades gracefully when Supabase env vars are absent: skill search and
save are disabled, custom skill entry still works.

## Supabase setup

1. Create a new Supabase project.
2. Open the SQL editor and run [`supabase/schema.sql`](supabase/schema.sql).
   This enables `pgvector`, creates `skill_embeddings` + `characters`, and adds
   the `match_skills` RPC.
3. Copy the project URL and anon key into `.env`:
   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

### Populating skill embeddings

The skill list is intentionally not in the repo — bring your own skill list
and embed it with OpenAI.

1. Create `scripts/skills.txt`, one skill per line. Format: `Name | optional description`.
2. Set the embedding env vars (service role key — never commit this):
   ```
   SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=...
   OPENAI_API_KEY=...
   ```
3. Run:
   ```bash
   node scripts/generate-embeddings.mjs
   ```

This batches at 64 inputs per OpenAI call and upserts on `skill_name`.

## Deploying to Vercel

1. Push to GitHub.
2. Import the repo in Vercel — it auto-detects Vite.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in **Project Settings → Environment Variables**.
4. Deploy.

No `vercel.json` needed — Vite's defaults (`npm run build` → `dist/`) match
Vercel's framework preset.

## System reference

| Cost                 | Rate                   |
| -------------------- | ---------------------- |
| HP                   | 2 BP per 3 HP          |
| EP                   | 2 BP per 1 EP          |
| Attribute level      | 50 BP                  |
| Magic school level   | 25 BP                  |
| Skill level cost     | exponential, see `src/system/costs.ts` |

Power tier budgets range from 150 BP (Peasants) to 2000 BP (World Savior).
