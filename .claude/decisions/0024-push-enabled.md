# 0024 — Push enabled; Live Activity deferred to v1.1

- **Date:** 2026-08-25
- **Status:** Accepted
- **Supersedes the blocked half of:** [0023](./0023-phase-3-resequenced-no-apple-account.md)
- **Decided by:** Ed Medina

## Context
The Apple Developer Program membership was approved on 2026-08-25. The seam
[0023](./0023-phase-3-resequenced-no-apple-account.md) built for exactly this
moment could be closed.

## Decision
**Push is on.** `expo-notifications` installed, the config plugin added
(`enableBackgroundRemoteNotifications: false` — nothing in v1 needs a silent
push), `eas.json` created with `EXPO_PUBLIC_APNS_ENV` set per profile, and
`PUSH_AVAILABLE = true` with all three adapters implemented in
[capability.ts](../../src/features/push/capability.ts).

**Widgets: both sizes, full build.** Next up. The App Group
`group.com.altagamafc.app` is declared in `app.json`; `WIDGETS_AVAILABLE` stays
false until the target exists.

**Live Activity: deferred to v1.1.** SPEC §4's version needs a minute label no
endpoint returns, an ActivityKit push token the push DTO would reject as an
undeclared field, and a push-to-start the dark cron cannot send. Building the
reduced version now would mean Swift that gets rewritten the day a live feed
lands. Revisit when one exists.

## Consequences
- ⚠ **Expo Go is gone.** Every run is `eas build` or `npx expo run:ios`.
- ⚠ **`threadIdentifier` cannot be set from JS.** SDK 57 exposes it on
  `NotificationContent` (output) but not `NotificationContentInput`, so a locally
  scheduled reminder cannot join the `fixture-{uuid}` thread the server's pushes
  use. A reminder and a later "kickoff moved" for the same fixture therefore
  appear as two notifications rather than one collapsed thread. Accepted — they
  say different things — but it is a real divergence from the design's grouping rule.
- ⚠ **A refused permission turns the alert switches OFF.** Leaving three green
  switches on a sheet that delivers nothing is the same dishonesty the score-age
  line exists to prevent.
- ⚠ **`Not now` in the primer does not ask.** iOS grants one prompt per install;
  an explicit decline leaves it unspent so the account sheet can still get a real
  prompt later.
- ⚠ **Simulators cannot register for remote notifications**, so `getDeviceToken()`
  answers null there. Local reminders, routing and `xcrun simctl push` all work on
  a simulator — only registration needs hardware.
- The deep-link parser moved to [deep-link.ts](../../src/features/push/deep-link.ts),
  which imports nothing native and is verified in a plain-JS harness: nine payload
  shapes including an unknown future type, a foreign scheme and a null payload,
  all of which open the app rather than crashing it.
- **The backend is still dark.** `CRONOGOL_PUSH_CRON_ENABLED='false'` and the four
  `APNS_*` vars are unset. The app will register successfully and receive nothing
  until someone configures `senpai-backend` with the `.p8`.

## Alternatives considered
- **Reduced Live Activity now** — genuinely good and cheap, but it is Swift with a
  known rewrite ahead of it; the widgets carry the same Guideline 4.2 argument
  without that.
