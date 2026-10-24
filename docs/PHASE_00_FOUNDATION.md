# Phase 0 and Foundation Sprint

## Objective

Make the existing Android application safely repeatable, then create the minimum universal seams required to attempt a web export without changing the current user experience or modifying stored data.

## Stories

### FND-001: Preserve the baseline

As the release owner, I can follow a written acceptance checklist for every existing workflow so future platform work cannot silently remove behavior.

Acceptance:

- `docs/acceptance/android-baseline.md` covers onboarding, hourly logging, clearing a prior entry, multi-hour planning, backlog, dashboard, sync, notification actions, CSV export, sign-out, and deletion.
- Each check has PASS, FAIL, BLOCKED, or NOT RUN status and requires evidence.
- Running the checklist is read-only except for test records created intentionally on a disposable profile/device.

### FND-002: Protect existing local records

As an existing user, I can retain a copy of my original local records before account migration.

Acceptance:

- The existing CSV export is documented as the supported user backup.
- The SQLite schema is captured in the baseline document.
- No migration uploads or deletes existing SQLite rows.

### FND-003: Establish workspace boundaries

As an engineer, I can develop the Expo app, extension, and shared packages without coupling browser builds to native-only modules.

Acceptance:

- Root workspace scripts address the Expo app and shared packages.
- `packages/core` imports no platform package.
- `packages/data` contains interfaces only at this gate.
- The existing `app/log.tsx` behavior change is preserved.

### FND-004: Extract shared contracts

As a client developer, I can build against stable domain, repository, queue, and platform-capability types.

Acceptance:

- Contracts include logs, plans, settings, profiles, conflicts, mutations, repositories, and capabilities.
- Runtime validation rejects invalid dates, hours, settings, and mutation envelopes.
- Node unit tests cover valid and invalid boundaries.

### FND-005: Define a version-safe cloud migration

As a signed-in user, my writes can eventually synchronize without duplicate application or silent concurrent overwrite.

Acceptance:

- The migration is additive to the existing schema.
- Every user-owned table has RLS.
- The mutation RPC handles first delivery, replay, version match, and conflict.
- Account deletion covers all new user-owned records.

### FND-006: Establish browser delivery shells

As a beta engineer, I can load install metadata for the PWA and a minimum-permission extension package before product UI is connected.

Acceptance:

- PWA manifest and icons resolve from public paths.
- The initial service worker caches only versioned application-shell assets and provides an explicit cache version.
- The extension manifest uses Manifest V3 and only storage, alarms, and notifications permissions.
- The extension contains no remotely hosted executable code.

## Validation commands

```sh
npm install
npm run test
npm run typecheck
npm run web:export
npm run android
```

`npm run android` requires a configured physical device or emulator. Notification acceptance requires a physical device.
