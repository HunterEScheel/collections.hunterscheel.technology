# Card Collection

My Magic: The Gathering collection, searchable with Scryfall syntax across binders,
quantities and prices, with Moxfield export and shareable binders. Deployed at
[mtg.jaeg.click](https://mtg.jaeg.click); the portfolio at [jaeg.click](https://jaeg.click)
links it alongside my other apps.

This repository used to hold those other apps too. Each now lives in its own repo; they
still share one Supabase project, whose migrations and Edge Functions live in
[HunterEScheel/jaeg.click](https://github.com/HunterEScheel/jaeg.click) under
`supabase/`. The card tables are its `0001…` series. Change the schema there, not here.

### Building without the Supabase keys

`src/lib/supabase.ts` throws at module load when `VITE_SUPABASE_URL` or
`VITE_SUPABASE_ANON_KEY` is missing. At build time those are inlined, so without them
the throw is unconditional, every module that imports the client becomes unreachable,
and the bundler drops the lot — you get a bundle with React in it and none of the app,
and the build still exits 0.

So always build with the keys set. A deploy has them; CI passes placeholders for the
same reason, and then checks the bundle actually contains the app rather than trusting
the exit code.

## Setup

1. The schema lives in the jaeg.click repo. To start from a new project, push it from
   there (`npx supabase link --project-ref YOUR_PROJECT_REF`, then `npx supabase db push`).

2. Enable email (magic link) auth in the Supabase dashboard under Authentication → Providers.

3. Configure the app:

   ```sh
   cp .env.example .env.local
   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from Project Settings → API
   ```

4. Run it:

   ```sh
   npm install
   npm run dev
   ```

## Deploying

Vercel, from the repository root. `vercel.json` sets the Vite framework preset and
rewrites every unmatched path to `index.html`, so a pasted link still loads the app.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project's environment
variables — they are read at build time, so a deploy without them serves a page that
fails on load.

Nothing in the app hardcodes its own domain: sign-in redirects are built from
`window.location.origin`. Supabase does not take that on trust, though — when the
domain changes, add the new origin under Authentication → URL Configuration (site URL
and redirect allow-list), or magic links will bounce.

## Usage

- Sign in with a magic link.
- **Import CSV** → **New Collection** (creates and loads) or **Update Collection**
  (upserts quantities into the selected collection; rows missing from the CSV are kept).
- Search with Scryfall syntax: `t:creature c:r cmc<=3 o:haste`, `(r:rare or r:mythic) usd<5`,
  `is:foil -t:land`.
- Two collection-specific fields: `qty>=2` (quantity) and `loc:"Trade Binder"` (binder name).
  Both also have dedicated UI controls that AND with the text query.

### Supported syntax

`name words`, `"exact phrase"`, `t:` `o:` `c:` `id:` `m:` `cmc:`/`mv:` `pow:` `tou:` `loy:`
`r:` `s:`/`set:`/`e:` `usd:` `is:`/`not:` `lang:` `qty:` `loc:`/`binder:`, comparison
operators `= != < > <= >=`, negation `-term`, `or`/`and`, parentheses.

## Development

```sh
npm test        # vitest (CSV parser, query engine, moves, exports)
npm run build   # typecheck + production build
npm run lint    # oxlint
```

