# Hour Tracker

Expo SDK 57 application for hourly time tracking, now organized as a multi-platform workspace:

- **Hourly ping** — high-priority (heads-up) notification at the end of every active hour. Quick-reply straight from the notification (`✏️ Log it`) or set the next hour's plan (`🎯 Next goal`) without opening the app.
- **Log screen** — "What I did" / "What I'll do next hour", plus an editable goal for the running hour (plans change). Today's table shows every active hour: logged ✅, backfilled 🕓, skipped ⏭, missing ❌.
- **Mandatory logging** — unlogged hours from previous days block the app until each is logged or explicitly skipped.
- **Lock screen** — a persistent silent notification pins the current hour's goal.
- **Dashboard** — streak, 7-day compliance, 14-day bars, `#tag` breakdown, most-logged hours, backfill ratio, CSV export.
- **PWA foundation** — static Expo Router output, install manifest, conservative service worker, and browser-safe local storage/exports.
- **Chrome companion foundation** — Manifest V3 popup and desktop alarm shell with minimum permissions.
- **Cloud transition** — the current app still supports optional legacy sync while the versioned, conflict-aware account model is rolled out through additive migrations.

## Stack

Expo SDK 57 · Expo Router · React Native Web · Expo SQLite · Notifee · Zustand · Supabase · Chrome Manifest V3.

Notifee requires a **dev build** — this app does not run in Expo Go.

## Install and verify

```sh
npm install
npm run check               # types, shared tests, extension syntax, production web export
```

## Run clients

```sh
npm run web                 # Expo web development server
npm run android             # Android development build
npm run ios                 # iOS development build
```

Grant notification permission on first launch; on Android 12+ you may also be sent to "Alarms & reminders" so pings arrive exactly on the hour.

Use **Settings → Send test ping** to verify the heads-up notification, quick reply, and deep link without waiting for the top of the hour.

## Cloud sync setup (optional)

1. Create a Supabase project and run [supabase/schema.sql](supabase/schema.sql).
2. Apply migrations in [supabase/migrations](supabase/migrations) in filename order in a disposable/staging project before production.
3. `cp apps/expo/.env.example apps/expo/.env` and fill in `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
4. Rebuild, then sign in with an email code under **Settings → Cloud sync**.

Without `.env` the app runs fully local.

## PWA preview

```sh
npm run web:export
npx serve apps/expo/dist
```

The generated site contains eight static routes plus `manifest.json`, `sw.js`, and 192/512 icons. PWA browser reminders are best effort; the extension or native apps are the dependable reminder surfaces.

## Chrome extension preview

The extension source is in `apps/extension`. After running `npm run check:extension`, load that directory as an unpacked extension in a development Chrome profile. The current popup queues entries locally; account synchronization remains a later phase and the UI says so explicitly.

## Store release (future gate)

Build with EAS: `eas build -p android --profile production` (AAB) and `eas submit -p android`.

Play-policy items already handled in the app:

- **No `USE_EXACT_ALARM`** (Play restricts it to alarm/calendar apps — it's in `blockedPermissions`). The app uses `SCHEDULE_EXACT_ALARM` and asks the user to grant "Alarms & reminders"; declare this in the Play Console permission form with the justification "user-scheduled hourly reminders."
- **Account deletion**: Settings → "Delete account & cloud data" (calls the `delete_account` RPC in `supabase/schema.sql`). Link this flow in the Play Data Safety form.

Still on you before submitting:

- Privacy policy URL (required — data collected: email + time logs, stored in Supabase).
- Data Safety form: email address (account management), user-generated content (logs), no ads/tracking.
- iOS: use actionable Time Sensitive notifications and prominent in-app goal visibility; an iOS Live Activity is not required for the first joint release.

## Layout

- `apps/expo/` — Expo Router PWA/native application and platform adapters
- `apps/extension/` — Manifest V3 Chrome companion
- `packages/core/` — platform-free domain types, time rules, and validation
- `packages/data/` — repository, capability, conflict, and mutation-queue contracts
- `packages/testing/` — shared fixtures
- `supabase/migrations/` — additive multi-platform database changes
- `PRODUCT_ROADMAP.md` — authoritative phase plan and release gates
- `docs/` — baseline acceptance, privacy contract, and current implementation status
