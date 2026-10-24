# Android Baseline Acceptance

Record a status of PASS, FAIL, BLOCKED, or NOT RUN for every item and attach the build identifier, device model, Android version, timestamp, and screenshot or log reference.

## Data safety

- [ ] Export CSV and verify all visible log rows are present before testing migration work.
- [ ] Confirm the SQLite `hour_logs` and `kv` tables remain present after upgrade.
- [ ] Confirm no existing record is uploaded without an explicit future migration decision.

## Core workflows

- [ ] Fresh install completes notification and alarm-permission onboarding.
- [ ] Current-hour goal can be created, edited, and cleared.
- [ ] A completed hour can be logged with `#tags`.
- [ ] Editing an existing `did` value to empty persists the cleared value.
- [ ] Long-press selection applies one goal to multiple hours.
- [ ] Missing prior-day hours force the backlog route until logged or skipped.
- [ ] Dashboard totals, compliance, tags, streak, and backfill ratio match fixture data.
- [ ] CSV export preserves date, hour, status, goal, activity, tags, and timestamps.

## Notifications

- [ ] Test ping arrives after approximately ten seconds.
- [ ] “Log it” saves its reply while the app is foregrounded, backgrounded, and terminated.
- [ ] “Next goal” applies to the next hour.
- [ ] Tapping an hourly or goal notification deep-links to the correct row.
- [ ] Current goal notification appears only inside the active window.
- [ ] Scheduled reminders are recreated after settings changes and device restart.

## Account and sync

- [ ] Email OTP succeeds and the session survives app restart.
- [ ] A local change uploads and a newer remote change downloads.
- [ ] Offline use retains local work and sync resumes after reconnection.
- [ ] Sign-out stops synchronization but retains the legacy local database.
- [ ] Account deletion removes cloud records and ends the session while retaining local records.

## Current baseline schema

`hour_logs` is keyed locally by `id` with a unique `(date, hour)` constraint. `kv` stores settings, onboarding state, first-use date, pull watermark, and per-hour goal overrides. Supabase currently stores only `hour_logs`, keyed by `(user_id, date, hour)`, with owner-only RLS.
