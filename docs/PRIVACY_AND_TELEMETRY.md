# Privacy and Telemetry Contract

## Activation

A user is activated after account verification, active-hour configuration, and three successfully stored hour logs.

## Allowed operational events

- `signup_completed`
- `onboarding_completed`
- `first_log_created`
- `activation_completed`
- `reminder_enabled`
- `sync_failed`
- `sync_conflict_created`
- `account_deleted`

Events may contain platform, application version, coarse error category, mutation age, queue depth, and delivery outcome. They must not contain journal text, goals, next-hour plans, tags, email addresses, access tokens, notification bodies, or exported CSV content.

## Retention and deletion

- Cloud records exist until the user deletes individual content or the account.
- Account deletion cascades through all user-owned cloud tables.
- Device caches and sessions are cleared after confirmed cloud deletion.
- Pre-account mobile records remain in the read-only legacy archive until the user explicitly clears application data.
- Diagnostic events use the shortest operationally useful retention period configured with the selected analytics provider before public beta.

## Capability copy

- PWA: “Browser reminders are best effort and may be delayed when the browser or operating system suspends background work.”
- Extension: “Desktop reminders require Chrome to be running and the extension to remain enabled.”
- Android: “Exact delivery depends on notification permission, alarm permission, battery policy, and device manufacturer behavior.”
- iOS: “Time Sensitive delivery depends on notification permission and Focus settings; iOS does not provide Android-style pinned notifications.”
