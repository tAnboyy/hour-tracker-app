# Hour Tracker Multi-Platform Product Roadmap

## Product direction

Hour Tracker is one account-backed product delivered through an installable PWA, a focused Chrome extension, and native Android and iOS apps. It targets individuals, requires an account for new cloud-backed activity, queues writes while offline, and preserves records created by the original local-only mobile app as a read-only legacy archive.

The platform promise is outcome parity, not identical mechanics. Android retains its high-priority and ongoing notifications. iOS uses actionable, time-sensitive notifications and prominent in-app goal visibility. PWA reminders are best effort. The extension is a fast desktop companion, not a second full application.

## Architecture

The target repository layout is:

```text
apps/
  expo/          Expo Router application for web, Android, and iOS
  extension/     Manifest V3 Chrome extension
packages/
  core/          Pure TypeScript domain types and rules
  data/          Repository, mutation queue, and platform capability contracts
  testing/       Shared contract fixtures
supabase/
  migrations/    Additive database migrations
  functions/     Scheduled and privileged backend functions
```

Supabase is authoritative for new account data. Each client keeps a platform-appropriate cache and durable mutation queue. Mutations carry an idempotency key and expected record version. The server either applies the mutation once or returns an explicit conflict; it never silently overwrites a concurrent edit.

Journal content (`did`, `goal`, and `next`) must never appear in analytics, diagnostic logs, cache keys, or error telemetry.

## Delivery phases

### Phase 0: baseline and product safety

- Record the current Android behavior and non-destructive local backup path.
- Define activation and privacy-safe operational events.
- Establish repeatable acceptance checks for logging, goals, backlog, dashboards, sync, notification actions, and deletion.

Exit: the existing product can be regression-tested without changing local user data.

### Phase 1: universal foundation

- Establish npm workspaces and isolate the Expo, extension, and shared packages.
- Extract pure domain types, time rules, validation, and analytics calculations.
- Introduce repository, queue, and platform-capability interfaces.
- Split storage, export, authentication, lifecycle, and notification behavior by platform.
- Produce successful type-check, unit-test, Android-regression, and web-export evidence.

Exit: web code does not import Notifee, native sharing, or native SQLite, and existing Android behavior is unchanged.

### Phase 2: cloud accounts and synchronization

- Apply additive Supabase migrations for profiles, settings, plans, versions, mutation idempotency, subscriptions, and conflicts.
- Require email OTP authentication before new account-backed writes.
- Add ordered, durable offline queues and version-checked mutation RPCs.
- Keep pre-migration SQLite records in a read-only legacy archive with separate CSV export.
- Add a conflict screen offering the local or cloud value.

Exit: two clients converge, duplicate delivery is harmless, RLS isolates users, and existing local records remain unchanged.

### Phase 3: installable PWA private beta

- Adapt all core product routes to responsive web behavior.
- Use IndexedDB for cached reads and queued writes.
- Add install metadata and a conservative application-shell service worker.
- Deploy private previews and production through EAS Hosting.
- Make offline, syncing, conflict, and refresh-error states visible.

Exit: invited users can install the PWA, work offline, restart, reconnect, and sync without losing a draft.

### Phase 4: best-effort PWA reminders

- Request permission only after explicit reminder opt-in.
- Store Web Push subscriptions and send timezone-aware end-of-hour reminders from a scheduled Supabase function.
- Deep-link supported notifications to the correct hour and degrade to an in-app reminder elsewhere.

Exit: supported installed PWAs pass subscription, test-notification, deep-link, permission-revocation, and subscription-expiry checks.

### Phase 5: Chrome extension

- Provide current goal, previous-hour logging, next-hour planning, missing-hour count, and sync state in the popup.
- Persist all state through `chrome.storage` and schedule reminders through `chrome.alarms`.
- Keep detailed onboarding, history, analytics, conflicts, export, and deletion in the PWA.
- Request only storage, alarms, and notifications permissions.

Exit: a user can log or plan within two interactions, alarms recover after Chrome restarts, and offline writes sync once.

### Phase 6: joint Android and iOS release

- Reconnect Android background actions and exact scheduling to the shared queue.
- Implement iOS actionable time-sensitive notifications without promising an Android-style pinned notification.
- Add universal links, platform-specific onboarding copy, privacy manifests, store metadata, and verified account deletion.

Exit: physical-device tests pass on both platforms and TestFlight/Play internal-track betas meet release gates.

### Phase 7: public rollout

Release in order: PWA, Chrome extension, then Android and iOS together. Each release requires zero confirmed data-loss incidents, at least 99.5% of queued mutations applied or surfaced as conflicts, at least 99.5% crash-free sessions, verified deletion, no critical security findings, and tested rollback/support runbooks.

## Test matrix

- Domain: timezones, daylight-saving changes, midnight, active-hour boundaries, tags, validation, and statistics.
- Database: additive migrations, RLS isolation, idempotency, version checks, conflicts, and deletion cascade.
- Repository contracts: every platform implementation runs against the same behavior suite.
- PWA: installability, responsive routes, offline restart, service-worker upgrades, and notification permission states.
- Extension: popup, worker suspension, alarm recreation, auth storage, offline replay, and minimum permissions.
- Native: foreground/background actions, cold starts, deep links, offline termination, and platform notification levels.
- Cross-client: conflicting offline edits resolve explicitly and then converge everywhere.

## Fixed decisions and constraints

- Expo stays on SDK 57 until an explicit upgrade project is approved. Use versioned SDK 57 documentation.
- Supabase remains the backend; email OTP remains the authentication method; EAS Hosting serves the PWA.
- Existing local records are never uploaded automatically.
- PWA notifications are best effort, and the extension is a focused companion.
- Builds and simulators do not prove notification delivery; mobile release requires physical-device evidence.
- Database changes are additive and rollback never reverses a destructive migration.
