# Implementation Status

Updated: 2026-10-24

## Completed locally

- Authoritative product roadmap and foundation sprint stories
- Android baseline acceptance and privacy/telemetry contracts
- npm workspace layout with Expo, extension, core, data, and testing packages
- Pure domain types, time rules, validation, repository contracts, mutation envelope, and bounded retry helper
- Additive Supabase foundation migration with RLS, mutation receipts, versions, and explicit log conflicts
- Expo web adapters for local storage, repository behavior, notification capability, runtime events, and CSV download
- PWA manifest, install icons, conservative service worker, static output, and platform-accurate onboarding copy
- Manifest V3 extension shell with popup logging, local queue, settings, aligned alarms, and test notification
- Root validation command covering package/app TypeScript, shared tests, extension syntax, and production web export
- GitHub Actions validation for pull requests and main-branch pushes

## Validated

- `npm run check`: PASS
- Shared Node tests: 8/8 PASS
- Expo production web export: PASS, eight static routes
- Chrome smoke check: PASS for onboarding, log, clean-route navigation, and dashboard rendering
- Original modified log screen hash before/after workspace move: identical

## Not yet complete

- Applying and integration-testing the Supabase migration against a staging project
- Required-account UX, durable IndexedDB/SQLite mutation queue implementations, cloud conflict resolution UI, and legacy archive UI
- Web Push subscription and scheduled delivery function
- Extension Supabase authentication and queue synchronization
- iOS notification implementation and universal links
- EAS preview/production deployment, Chrome Web Store packaging, TestFlight, Play internal testing, and physical-device evidence
- Private beta metrics, production monitoring, privacy policy URL, and store disclosures

## Dependency audit

Expo was aligned to the safe SDK 57 patch line (`expo ~57.0.31`, React Native 0.86.3), resolving the Hermes memory regression reported against the original dependency set. A non-force `npm audit fix` removed the critical `shell-quote` advisory and other safe transitive findings. Nine advisories remain in the Expo/Router toolchain; the force repair is intentionally not applied because it proposes incompatible Expo SDK 44 or Expo Router SDK 58 changes. Resolve these through SDK 57-compatible upstream releases or a separately planned Expo upgrade.

Expo Doctor passes 20 of 21 checks. Its only remaining finding is that React Native Directory marks Notifee unmaintained; replacement is deferred because Notifee currently provides the product's Android alarm, ongoing-notification, quick-reply, and headless-event behavior.
