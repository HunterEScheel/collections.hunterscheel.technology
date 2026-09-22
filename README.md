# Collections

Everything I own, searchable in one place: a Magic collection and a kitchen pantry,
behind one login. Deployed at
[collections.hunterscheel.technology](https://collections.hunterscheel.technology).

Sign in at the root and pick a category:

| Route | What it is |
| --- | --- |
| `/` | The gate — sign in, then choose which collection to search |
| `/mtg` | Magic collection: Scryfall-syntax search over your binders |
| `/kitchen` | Pantry, recipes and the shopping list |

```
.                 the React app (Vite + Tailwind + Supabase)
├─ src/           /mtg lives at the top level; /kitchen and the gate in their own folders
├─ android/       the My Kitchen Android app (Kotlin, offline-first, syncs to Supabase)
└─ supabase/      migrations for both — card tables, and kitchen_* for the pantry
```

The kitchen has the same three places on the web as on the phone — pantry, recipes,
shopping list — reading and writing the same synced rows. Use whichever is to hand: the
phone works with no signal at the shelf, the website is easier to type into. The Android
app is downloadable from `/kitchen`; CI publishes the APK to a fixed release tag on every
push to `main`, so the link never goes stale.

Deletes on the web are soft (`deleted_at`), which is how a deletion reaches the phone —
a hard delete would simply vanish from its next pull and the item would live on in a
pocket forever.

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

1. Create a Supabase project and run the migration:

   ```sh
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

   (or paste the files in `supabase/migrations/` into the SQL editor — the `0001…`
   series is the card collection, `kitchen_0001_init.sql` the pantry)

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
rewrites every unmatched path to `index.html`, which is what makes `/kitchen` and `/mtg`
survive a refresh or a pasted link.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project's environment
variables — they are read at build time, so a deploy without them serves a page that
fails on load. Point the `collections` CNAME at Vercel and add the domain to the project.

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
npm test        # vitest (CSV parser, query engine, pantry rules)
npm run build   # typecheck + production build
npm run lint    # oxlint
```

The Android app has its own build; see `android/README-android.md`.

```sh
cd android && ./gradlew test assembleDebug
```
