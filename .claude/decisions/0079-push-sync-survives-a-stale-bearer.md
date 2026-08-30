# 0079 — The push registration survives a stale bearer, and says whether it landed

- **Date:** 2026-08-30
- **Status:** Accepted — `tsc`/lint/export clean; the re-registration not yet watched on the device
- **Decided by:** Ed Medina
- **Builds on:** [0053](./0053-goal-alerts.md) (goal alerts), [0023](./0023-push-capability-gate.md)

## Context

Real Madrid v Málaga, 2026-08-30. The Goals switch was on, `CRONOGOL_LIVE_PUSH_ENABLED` was
`'true'` on Render, and no banner arrived for three goals. Read from production the same
afternoon:

- `live_push_sent` held all three (`goal:normal:19::real-madrid:Bellingham` claimed 15:23:28Z,
  the 26′ own goal, Mbappé 30′). The backend detected, claimed and dispatched every one.
- `device_tokens` held **one** live row: `production`, linked to the account,
  **`alert_goals: false`**, `updated_at` **2026-08-28 19:24:37Z**, no push-to-start token.

`LivePushService.devices()` filters `alert_goals = true`, so the fan-out had zero targets.
Every `PUT /cronogol/push/device` since 08-28 19:24 had failed, and nothing on any screen or
in any log said so: `syncPushRegistration` ended in a bare `catch { return 'failed' }`.

The likeliest path, which the code documented and did not handle: the device is signed in,
so the sync attaches `getAccessToken()` — a plain `getSession()` read — and the route
answers **401 to a stale bearer** rather than degrading to anonymous (deliberately: a missing
credential is acceptable, a bad one is not). `account.ts` has the refresh-once discipline
(`withAuth`); the push sync never did, so one dead token made every registration fail until
the next successful sign-in.

## Decision

- **`register()` in `features/push/sync.ts`: three attempts, in order.** The bearer we hold;
  on 401, a refreshed one, once; on a second 401 or no refresh, **anonymously**. Anonymous is
  lossless — the route accepts it and the server keeps the link it already has (there is no
  unlink; `push.ts`). The switches and the follow list land; `view.linked` comes back false
  so the link is re-asserted on the next change or launch rather than assumed.
- **Never signs out from the sync.** A dead session is the account sheet's finding to make,
  on a screen that can show it; a background registration has no business ending one.
- **Every non-`sent` outcome is logged** as `[push-sync] …` — a status code or `no device
  token`, never a body, never a token.
- **`store/push-sync-status.ts`** keeps the last verdict (`at`, `ok`) — persisted, hydrated at
  import — and the account sheet's footnote under the alert switches reads one of three
  lines: never registered · saved at *time* (the reader's clock) · could not be saved,
  retrying. The stale "start arriving once the app is released" copy went with it.
  `AccountSheet` takes the resolved line as `alertsNote`; the route resolves it because the
  organism has no clock.

## Consequences

- The specific failure — switch on, server says off, for days — now prints a red-flag line
  where the switch is, and the reason in the console.
- The first fix is on the device: open Account → Alerts, and the footnote must read
  "saved · <time>" within two seconds of toggling Goals; `device_tokens.alert_goals` must read
  `true` after (the backend's read-only probe, or SQL). Only then is a goal banner possible.
- The status is a verdict, not a queue: `'unchanged'` never writes it, so a launch with
  nothing to send leaves the last real outcome on screen.
- Not addressed: a 400 from an undeclared field still costs the whole registration (the DTO
  is `forbidNonWhitelisted`); it is now at least visible as `[push-sync] failed: HTTP 400`.
