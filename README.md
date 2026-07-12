# Hour Tracker

Android-first React Native (Expo) app for hourly time tracking:

- **Hourly ping** — high-priority (heads-up) notification at the end of every active hour. Quick-reply straight from the notification (`✏️ Log it`) or set the next hour's plan (`🎯 Next goal`) without opening the app.
- **Log screen** — "What I did" / "What I'll do next hour", plus an editable goal for the running hour (plans change). Today's table shows every active hour: logged ✅, backfilled 🕓, skipped ⏭, missing ❌.
- **Mandatory logging** — unlogged hours from previous days block the app until each is logged or explicitly skipped.
- **Lock screen** — a persistent silent notification pins the current hour's goal.
- **Dashboard** — streak, 7-day compliance, 14-day bars, `#tag` breakdown, most-logged hours, backfill ratio, CSV export.
- **Cloud sync (optional)** — offline-first SQLite with last-write-wins sync to Supabase via email OTP sign-in.

## Stack

Expo SDK 57 · expo-router · expo-sqlite · @notifee/react-native · zustand · Supabase.

Notifee requires a **dev build** — this app does not run in Expo Go.

## Run (Android)

```sh
npm install
npx expo run:android        # builds and installs the dev build
```

Grant notification permission on first launch; on Android 12+ you may also be sent to "Alarms & reminders" so pings arrive exactly on the hour.

Use **Settings → Send test ping** to verify the heads-up notification, quick reply, and deep link without waiting for the top of the hour.

## Cloud sync setup (optional)

1. Create a Supabase project, run [supabase/schema.sql](supabase/schema.sql) in the SQL editor.
2. `cp .env.example .env` and fill in `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
3. Rebuild, then sign in with an email code under **Settings → Cloud sync**.

Without `.env` the app runs fully local.

## Store release (Play Store / App Store)

Build with EAS: `eas build -p android --profile production` (AAB) and `eas submit -p android`.

Play-policy items already handled in the app:

- **No `USE_EXACT_ALARM`** (Play restricts it to alarm/calendar apps — it's in `blockedPermissions`). The app uses `SCHEDULE_EXACT_ALARM` and asks the user to grant "Alarms & reminders"; declare this in the Play Console permission form with the justification "user-scheduled hourly reminders."
- **Account deletion**: Settings → "Delete account & cloud data" (calls the `delete_account` RPC in `supabase/schema.sql`). Link this flow in the Play Data Safety form.

Still on you before submitting:

- Privacy policy URL (required — data collected: email + time logs, stored in Supabase).
- Data Safety form: email address (account management), user-generated content (logs), no ads/tracking.
- iOS later: replace the ongoing goal notification with a **Live Activity**, use **Time Sensitive** interruption level for pings (no "above all others" on iOS), and expect App Review to test account deletion.

## Layout

- `app/` — expo-router screens: `log` (home), `backlog` (day gate), `dashboard`, `settings`, `onboarding`
- `src/db.ts`, `src/repo.ts` — SQLite singleton + all queries (shared with the headless notification handler)
- `src/notifications/` — channels, hourly trigger scheduler, ongoing lock-screen goal notification, quick-reply event handling
- `src/sync.ts`, `src/supabase.ts` — offline-first Supabase sync
