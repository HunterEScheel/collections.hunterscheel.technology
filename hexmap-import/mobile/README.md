# Hexmap Combat Companion (Android)

A bare React Native Android app that mirrors the hexmap web app's Initiative
Tracker and can float it **over other apps** as a draggable bubble that
expands into a full combat panel. Live-synced with the same Supabase backend
as the web app.

## Features

- Floating overlay (SYSTEM_ALERT_WINDOW): collapsed 64dp bubble showing entry
  count + top of turn order; tap to expand into the full tracker; long-press
  the bubble to stop the session.
- Live sync: Supabase Realtime on `initiative_tracker` and `characters`, with
  reconnect + periodic reconcile. Works both directions with the web app.
- Player mode: set your name (same identity model as the web app), join
  initiative with a roll; your character's HP/AC are snapshotted into the
  encounter. You see your own real HP; others show fog-of-war labels.
- GM mode: enter the admin PIN (verified server-side, held in memory only) to
  add creatures (Open5e SRD search or custom, with numbered copies),
  damage/heal, remove entries, and clear the tracker.

## Setup

1. `cp .env.example .env` and fill in the Supabase URL + publishable key
   (same values as `web/.env.local`, without the `VITE_` prefix).
2. `npm install`
3. Build/run:
   - Dev (needs Metro): `npx react-native run-android`
   - Standalone install to a connected phone:
     `cd android && ./gradlew installRelease`
   - Just the APK: `cd android && ./gradlew assembleRelease`
     → `android/app/build/outputs/apk/release/app-release.apk`

## Using the overlay

1. Open the app, set your player name (and optionally enter GM mode).
2. Tap **Start floating overlay**. The first time, Android opens Settings —
   enable **Display over other apps** for Hexmap Companion, then tap the
   button again.
3. The bubble floats over everything; drag to reposition, tap to expand.
   Stop it from the bubble long-press, the persistent notification's Stop
   action, or the in-app button.

## Architecture notes

- **Legacy RN architecture** (`newArchEnabled=false`, RN pinned to 0.81.x):
  the overlay attaches a `ReactRootView` to `WindowManager` from a foreground
  service via `ReactInstanceManager` — a bridge API that bridgeless RN
  removes. Migrating to the new architecture requires porting
  `OverlayService` to `ReactHost.createSurface`.
- The overlay and the main activity are two RN surfaces in **one JS runtime**,
  so the zustand store and the Supabase socket are shared; the foreground
  service (type `specialUse`) keeps them alive when the activity is killed.
- Types in `src/types.ts` mirror `web/src/types/index.ts` — keep in sync
  manually.
- GM writes go through the `admin-action` Edge Function (`{pin, action,
  payload}`); the anon key can only SELECT/INSERT on `initiative_tracker`.

## Known limitations / v2 ideas

- No turn pointer or round counter — the web app doesn't have one either.
  Adding it needs a `combat_state` table (realtime-enabled) plus new
  `admin-action` cases (`set_turn`, `advance_turn`) and UI in both clients.
- The GM PIN is not persisted; re-enter after process death (matches web).
- If an aggressive OEM battery manager kills the realtime socket, exempt the
  app: Settings → Battery → Unrestricted (the 60s reconcile also self-heals).
