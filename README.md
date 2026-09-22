# My Kitchen

An Android app for keeping track of what's actually in the kitchen — baking goods,
grains, spices, oils, cans, and everything else — so you find out you're out of
cumin before you start cooking, not halfway through.

Everything is stored on the device. No account, no network permission, no sync.

## What it does

- **Pantry list.** Every item with its quantity, unit, category, where it lives,
  and an optional best-before date. `+` / `-` buttons on each row adjust stock by a
  sensible step for its unit (50 g of flour, one jar of paprika) without opening a form.
- **Restock tracking.** Each item has a "restock at" level. Anything at or below it is
  flagged **LOW**; anything at zero is flagged **OUT**.
- **Shopping list.** Built automatically from those flags, grouped by category, with
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
| `data/` | Room entity, DAO, database, repository, plus the filter/sort rules |
| `ui/` | Compose screens, view models, Material 3 theme |

- **UI:** Jetpack Compose + Material 3, with dynamic color on Android 12+.
- **Storage:** Room (`pantry.db`), exposed as Kotlin `Flow`s so the screens update
  themselves when anything changes.
- **State:** one `PantryViewModel` shared by the pantry and shopping screens, and a
  short-lived `ItemEditViewModel` per edited item.
- **Dependency wiring:** a `KitchenApp` Application holding a single repository — no
  DI framework, because there's nothing here that needs one.

Filtering and sorting live in Kotlin (`PantryFilter.kt`) rather than in SQL: a home
pantry is a few hundred rows, and the rules stay readable and unit-testable in one place.

### Tests

`app/src/test/` covers the logic worth getting right: stock status at the threshold
boundary, quantity formatting, expiry arithmetic against a fixed date, and every
filter/sort combination.

```
./gradlew test
```
