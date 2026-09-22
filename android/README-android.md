# My Kitchen

An Android app for keeping track of what's actually in the kitchen — baking goods,
grains, spices, oils, cans, and everything else — so you find out you're out of
cumin before you start cooking, not halfway through.

Everything is stored on the device and the app works entirely offline. Optionally it
also syncs to a Supabase project — the same one behind
[mtg-collection-search](https://github.com/HunterEScheel/mtg-collection-search), so one
login covers both — and your kitchen follows you to another device.

## What it does

- **Pantry list.** Every item with its quantity, unit, category, where it lives,
  and an optional best-before date. `+` / `-` buttons on each row adjust stock by a
  sensible step for its unit (50 g of flour, one jar of paprika) without opening a form.
- **Custom increment.** Any item can override that step with its own "increment by"
  value, so eggs move six at a time and olive oil moves a quarter litre. Leave it
  blank and the item keeps following its unit.
- **Restock tracking.** Each item has a "restock at" level. Anything at or below it is
  flagged **LOW**; anything at zero is flagged **OUT**.
- **Recipe book.** Recipes with ingredients and servings. Each ingredient is matched
  against the pantry by name and shown as **have**, **short**, or **need**, with real
  unit conversion — a recipe asking for 200 g of flour is satisfied by the kilo bag.
  Units that can't be compared (100 ml of honey against two jars of it) are flagged
  to check rather than guessed at.
- **Shop for what you don't have.** Put a recipe "on the plan" and everything it
  needs that your kitchen can't cover joins the shopping list, deduped and summed
  across recipes — two recipes each short 100 g of butter make one 200 g line.
- **Shopping list.** Recipe needs, then items low on stock grouped by category, with
  tick-off checkboxes for the trip and a share button that sends the list to any app.
- **Use soon.** Items expired or expiring within two weeks, so food gets cooked
  rather than binned.
- **Search and filter.** Search across name, storage location, notes and category;
  filter by category or "needs restock"; sort by name, category, soonest expiry, or
  recently updated.
- **Starter pantry.** An empty kitchen offers ~30 common staples you can seed and
  then edit, so you're not typing "salt" into a blank screen.
- **Undo.** Deleting an item offers an undo snackbar.

## Categories

Baking · Grains & Pasta · Spices & Herbs · Oils & Vinegars · Canned & Jarred ·
Sauces & Condiments · Produce · Dairy & Eggs · Meat & Seafood · Frozen · Snacks ·
Drinks · Other

Units cover weight (g, kg, oz, lb), volume (ml, L, cups, tbsp, tsp) and whole
things (pieces, packages, cans, jars, bags, boxes, bottles).

## Syncing (optional)

Two apps, one Supabase project, one account. The kitchen tables are all prefixed
`kitchen_`, as are their migration files, so this repository and the collection app can
push to the same project without colliding.

1. Apply the schema to your existing Supabase project — either
   `supabase db push` from this repository, or paste
   `supabase/migrations/kitchen_0001_init.sql` into the SQL editor.
2. Put the project's credentials in `local.properties` (not committed):

   ```properties
   supabase.url=https://YOUR-PROJECT.supabase.co
   supabase.anonKey=YOUR-ANON-KEY
   ```

3. Rebuild, open the cloud icon on the Pantry screen, and sign in with your email.
   You get a six-digit code rather than a magic link, because a code needs no deep
   link to find its way back into the app.

Leave `local.properties` empty and none of this exists: no account, no network traffic,
and the sync screen says as much.

### How the sync behaves

- **Offline first.** Room stays the source of truth. Every screen reads local data, so
  the app is exactly as fast and as usable with no signal.
- **Client-owned ids.** Rows get a uuid when they are created on the phone, so pushing
  is an idempotent upsert — a retry after a dropped connection cannot duplicate a row.
- **Server-stamped times.** `updated_at` is set by a Postgres trigger, so the pull
  cursor cannot be poisoned by a phone with a wrong clock.
- **Push, then pull.** Local edits reach the server before remote rows are applied on
  top, which is what makes the conflict rule meaningful rather than arbitrary.
- **Last write wins, per row**, with one exception: a local row still waiting to be
  pushed is never overwritten by an incoming one. Two devices editing the same item
  between syncs means the later sync wins — there is no merge of individual fields.
- **Deletes leave tombstones**, so removing something here removes it everywhere
  instead of being resurrected by the next pull.

## Building

Requires Android Studio (or a command-line Android SDK) with API 35 and JDK 17.

```
./gradlew assembleDebug      # APK at app/build/outputs/apk/debug/
./gradlew test               # unit tests
./gradlew installDebug       # install on a connected device or emulator
```

minSdk is 26 (Android 8.0), targetSdk 35.

## How it's put together

| Layer | What's there |
| --- | --- |
| `data/` | Room entities, DAOs, database, repositories, plus the filter/sort and recipe-matching rules |
| `data/sync/` | The optional Supabase client, the local↔remote mapping, and the conflict rules |
| `ui/` | Compose screens, view models, Material 3 theme |

- **UI:** Jetpack Compose + Material 3, with dynamic color on Android 12+.
- **Storage:** Room (`pantry.db`), exposed as Kotlin `Flow`s so the screens update
  themselves when anything changes.
- **State:** one `PantryViewModel` shared by the pantry and shopping screens, and a
  short-lived `ItemEditViewModel` per edited item.
- **Dependency wiring:** a `KitchenApp` Application holding the repositories — no DI
  framework, because there's nothing here that needs one.
- **Sync:** a hand-rolled Supabase client over OkHttp and kotlinx.serialization. The
  official SDK would pull in a stack of transitive dependencies to replace about a
  hundred lines of HTTP; the conflict rules and the mapping are pure functions, which
  is what makes them testable without a database or a network.

Filtering and sorting live in Kotlin (`PantryFilter.kt`) rather than in SQL: a home
pantry is a few hundred rows, and the rules stay readable and unit-testable in one place.
The same goes for recipe matching (`RecipeMatching.kt`) — unit conversion, per-ingredient
availability and shopping-list aggregation are pure functions over plain data.

Recipe ingredients point at the pantry by **name**, not by a stored id. Renaming a
pantry item re-points every recipe that mentions it, and deleting one leaves nothing
dangling.

### Tests

`app/src/test/` covers the logic worth getting right: stock status at the threshold
boundary, quantity formatting, expiry arithmetic against a fixed date, every
filter/sort combination, unit conversion in both directions, each availability
verdict, and shopping-list aggregation across recipes.

```
./gradlew test
```
