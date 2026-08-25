# Push notifications & account deletion — hooking up to the backend

**Written 2026-08-24**, the day the backend shipped both subsystems
(`senpai-backend` CRONOGOL.md §92–§93, decisions 0027/0028). This file is the
app-side hookup guide; the wire contract itself lives in
`senpai-backend/CRONOGOL-API.md` ("push device" and "DELETE /cronogol/me"
sections) and wins on any disagreement.

## Status — read this first

| Piece | State |
| --- | --- |
| `PUT /cronogol/push/device` / `DELETE /cronogol/push/device` | **Live.** Register today; rows are stored. |
| `DELETE /cronogol/me` (account deletion) | **Live.** |
| Server actually SENDING pushes | **Dark.** Ships behind `CRONOGOL_PUSH_CRON_ENABLED='false'` until the APNs sandbox probe + an operator dry-run pass — both gated on the Apple Developer account (which also gates the push entitlement for dev builds). **No push will arrive on any device until then.** Build and register anyway; nothing breaks. |
| Kickoff reminders | **Never sent by the server, by design.** The app schedules them locally from fixture data (handoff SPEC §4 payload 1). |
| Goal / score pushes | **Do not exist and are not coming with this** — no live feed. The type is reserved. Keep the goal switch drawn disabled with its reason (handoff rule). |
| Sign in with Apple | Still absent. Google + email/password via Supabase Auth, unchanged. |

## Registering a device

`PUT https://crono-gol.com/cronogol/push/device` — an **idempotent wholesale
replace** keyed on the APNs token. Call it:

1. after the user grants notification permission (which the onboarding asks
   **after** the alert primer, never on cold launch — handoff §3.7);
2. on every app launch (tokens rotate on restore/reinstall);
3. on every follow/unfollow and every alert-switch change (send the full
   current state each time — there is no PATCH).

```jsonc
// body — anonymous works; a bearer links the registration to the account
{
  "token": "<64 lowercase hex — the RAW APNs token, see below>",
  "platform": "ios",
  "lang": "es",                          // "es" | "en" — the push copy language
  "clubSlugs": ["real-madrid", "sevilla"], // slugs from GET /cronogol/teams — never invented
  "alertMoved": true,                    // kickoff moved / confirmed / TBD / reinstated
  "alertPostponed": true,                // postponed / cancelled
  "environment": "sandbox"               // ⚠ REQUIRED IN PRACTICE for dev builds — see below
}
// 200 → { clubSlugs, alertMoved, alertPostponed, lang, environment, linked }
```

### ⚠ The token must be the RAW APNs device token — not an Expo push token

The backend talks to APNs directly (backend decision 0027). With
`expo-notifications` that means:

```ts
// ✅ the native APNs token — token.data is the 64-hex string (lowercase it)
const token = await Notifications.getDevicePushTokenAsync();

// ❌ NOT this — an ExponentPushToken only works with Expo's push service,
// which this product deliberately does not use
await Notifications.getExpoPushTokenAsync();
```

The route rejects anything that is not 64 lowercase hex with a 400.

### ⚠ `environment` — a dev build must say `"sandbox"`

A debug/dev-client build's token is only reachable through Apple's **sandbox**
APNs host, and the server routes each send by this field, per device. A dev
build that registers as `production` (the default) simply never receives
anything, with no error anywhere. Wire it to the build type
(`__DEV__` / release channel), not to a hardcoded value.

### Account linking semantics

- **Anonymous registration is first-class** — onboarding follows clubs before
  any account exists, and push works from that moment (backend decision 0028).
- Registering **with** a bearer token links the row (`linked: true`).
- Re-registering **without** a bearer **keeps** an existing link — a signed-out
  app refresh never unlinks. There is no unlink operation; sign-out changes
  nothing server-side about the device.
- The response **never echoes the token** and never says whose account holds a
  linked row.

### Unregistering

`DELETE /cronogol/push/device` with body `{ "token": "…" }` → **204**,
idempotent, silent on unknown tokens. This is the "alerts off for this device"
action — it touches no account, no feed, no other device. A later register PUT
revives the same registration. (Flipping both `alertMoved` and
`alertPostponed` to false via PUT is equivalent in effect and keeps the row
live; either is fine.)

### Errors & limits

- **404** names an unknown club slug — slugs must come from `GET /cronogol/teams`.
- **400** for a malformed token, an undeclared body field
  (`forbidNonWhitelisted`), or a string where a boolean belongs (no coercion —
  send real JSON booleans).
- **429** at 20/minute on both routes. Debounce; don't retry-loop.

## What arrives — the payload contract

Two types, sent when a **followed club's** fixture changes (detected by the
~3h sync, dispatched within ~30 min after a 30-min quiet period):

```jsonc
// kickoff_moved — also covers date-confirmed, date-tbd, reinstated
{ "aps": { "alert": { "title": "Kickoff moved — Sevilla – Osasuna",
                      "body": "Sun 16:15 → Sun 18:30. Your calendar entry has already been updated." },
           "thread-id": "fixture-<uuid>", "interruption-level": "active", "sound": "default" },
  "type": "kickoff_moved", "fixtureId": "<uuid>", "clubSlug": "sevilla",
  "oldKickoffUtc": "…", "newKickoffUtc": "…", "deepLink": "altagamafc://club/sevilla" }

// fixture_postponed — status is "postponed" | "cancelled"
{ "aps": { "alert": { "title": "Postponed — …", "body": "Removed from your calendar. …" },
           "thread-id": "fixture-<uuid>", "sound": "default" },
  "type": "fixture_postponed", "fixtureId": "<uuid>", "clubSlug": "…",
  "status": "postponed", "deepLink": "altagamafc://club/…" }
```

- ⚠ **`fixtureId` is a uuid STRING.** The handoff SPEC §4's numeric ids were
  prototype placeholders — type it `string`, key nothing on numbers.
- Copy arrives in the registered `lang`; times are rendered server-side in the
  club's timezone. TBD renders as `TBD` / `por confirmar`, never `00:00`.
- `thread-id` = `apns-collapse-id` = `fixture-{uuid}`: re-reschedules collapse
  into one notification group instead of stacking — don't build client-side
  dedupe.
- `deepLink` matches this app's `scheme: "altagamafc"` — route it to
  `/club/[slug]`.

## What the app owns

- **Kickoff reminders** — schedule local notifications from
  `kickoffUtc` (the "30 minutes before" alert). No server round-trip; the
  server will never send a reminder.
- **The reminder switch** in the account sheet is therefore **local state**;
  only `alertMoved`/`alertPostponed` map to server fields.
- **Re-sync after a `kickoff_moved`** — refresh the affected club's fixtures
  on open; the payload's `newKickoffUtc` is also enough to reschedule the
  local reminder immediately.

## Account deletion — `DELETE /cronogol/me`

Bearer required. **204, no body, idempotent** (a retry after a timeout also
204s — the JWT stays signature-valid briefly after the user is gone). On the
server it: revokes **every claimed calendar feed first** (permanent — each
feed's `.ics` keeps answering 200 with an empty calendar; the entry stays on
the device until the user deletes it there — say so in the confirmation copy,
same caveat as single-feed unsubscribe), then deletes the auth user, profile
and pending email change.

**Device push registrations survive, unlinked** — deleting the account does
not silently disable this device's alerts. If the deletion flow should also
stop alerts, call `DELETE /cronogol/push/device` yourself alongside.

Client afterwards: discard the Supabase session, clear local account state,
land signed-out. Two-step confirm in the UI — the server has no undo. Throttle
5/minute. This is the Guideline 5.1.1(v) requirement, satisfied.

## Where the backend documents all this

| What | Where |
| --- | --- |
| Wire contract (authoritative) | `senpai-backend/CRONOGOL-API.md` — push device + `DELETE /cronogol/me` sections |
| Architecture & semantics | `senpai-backend/CRONOGOL.md` §92 (push), §93 (deletion) |
| Why device-scoped, why direct APNs | `senpai-backend/.claude/decisions/0028`, `0027` |
| Gap audit this closes | `senpai-backend/.claude/cronogol/ios-app-audit.md` §3.1, §3.3 |
