# Collections

Everything I own, searchable in one place: a Magic collection, a kitchen pantry and an
RPG character builder, behind one login — plus the portfolio. Deployed at
[jaeg.click](https://jaeg.click).

Sign in at the root and pick a category:

| Route | What it is |
| --- | --- |
| `/` | The gate — sign in, then choose which collection to search |
| `/mtg` | Magic collection: Scryfall-syntax search over your binders |
| `/kitchen` | Pantry, recipes and the shopping list |
| `/hexcraft` | Hexcraft RPG: character builder, sheets, monsters, GM guide |
| `/bio` | The portfolio — public, and a separate page from the app |
| `/hexmap` | Guild Hexmap: the campaign companion — public, also its own page |
| `/fireworks` | Firework Fund: pledges toward the fireworks show and its receipts — public, its own page |

```
.                   four pages built from one repo
├─ index.html       the Collections app: signed in, Tailwind, one router
├─ bio.html         the portfolio: public, its own CSS and fonts
├─ hexmap.html      the campaign companion: public, its own CSS
├─ fireworks.html   the fireworks pledge tracker: public, its own CSS and router
├─ src/             /mtg at the top level; the gate and the other apps in their own folders
├─ scripts/         one-off tooling (Hexcraft skill embeddings)
└─ supabase/        migrations and Edge Functions — cards, kitchen_*, hexcraft_*, hexmap_*, fireworks_*
```

`/bio`, `/hexmap` and `/fireworks` are deliberately **separate entry points** rather
than routes inside the app. Each brings its own CSS that restyles `:root`, `html` and
`body`; sharing a page would mean scoping every one of those rules, or watching the
card search turn into an illuminated manuscript. Separate entries cost a page load
when moving between them and remove the problem entirely.

It also keeps them outside the sign-in gate, which is where they belong: a portfolio is
for anyone, Hexmap's players identify by name with a PIN for admin rather than
holding accounts, and Firework Fund's contributors unlock an event with its passcode.
See `docs/hexmap.md` for what its move to the shared project needs — including four
RPCs that live only in the old project — and `docs/fireworks.md` for Firework Fund's.

The kitchen lives on the web: the pantry, recipes that tell you what you are missing,
and a shopping list built from both. A new kitchen can start from a set of common
staples rather than an empty list.

Hexcraft is the RPG character builder, with sheets, a monster maker and the GM guide.
Its skill search wants embeddings in the database; see `docs/hexcraft.md`. Without them
the rest of the app works and skills can be typed in by hand.

Deleting removes the row. Soft deletes are for telling another client what went
away; with one client there is nobody to tell, and a table of hidden rows that every
query must remember to filter is a bug waiting to happen.

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
   series is the card collection, `kitchen_*` the pantry, `hexcraft_*` the RPG,
   `hexmap_*` the campaign companion, `fireworks_*` the pledge tracker)

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
npm test        # vitest (CSV parser, query engine, pantry rules)
npm run build   # typecheck + production build
npm run lint    # oxlint
```

