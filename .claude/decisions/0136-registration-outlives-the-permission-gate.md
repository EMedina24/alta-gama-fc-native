# 0136 — Device registration outlives the notification-permission gate

- **Date:** 2026-09-08
- **Status:** Accepted — tsc + lint pending in this change's verification; the
  fresh-install permission flows need a real device
- **Decided by:** Ed Medina — "drop the gate", "alertGoals survives denial and
  never prompts", both 2026-09-08, investigating a user's dead lock-screen card
- **Amends:** [0024](./0024-push-enabled.md) — completes the "the account sheet
  can still get a real prompt later" it reserved and never built; its
  onboarding refusal rule (banner switches off on a denied primer prompt)
  stands, now explicitly banner-only. [0055](./0055-live-activities-broadcast-channels.md)
  §5's `alertGoals` consent switch is unchanged in meaning; it just works
  without the banner permission now, which was always true of the thing it
  consents to.

## Context

A user deferred the "Allow notifications" prompt and their Live Activity never
worked. The trace: `getDeviceToken()` refused to even ask iOS for the APNs
token without `getPermissionsAsync().granted`, `syncPushRegistration` bailed
`'no-token'` before `getPushToStartToken()` was ever read, no `device_tokens`
row existed, and the backend's `eligible()` filtered the device out of every
start. iOS mints both tokens regardless of the banner permission — the
permission gates what a push may *show*, not whether the device can register,
and Live Activity delivery is governed by Settings → Live Activities, a
different switch entirely. Meanwhile the account sheet showed the reassuring
"saved and sent when online" note, and the `alertGoals` switch turned green
while doing nothing.

Three adjacent defects surfaced in the same trace: the `onPushToStartToken`
effect closed over a stale `prefs` (a late token re-sent old switches through
the wholesale PUT, which also nulls `push_to_start_token` server-side when the
body omits `activityToken`); nothing re-ran registration when the reader
granted permission later in iOS Settings; and no switch outside onboarding
could spend the system prompt at all.

## Decision

1. **The permission check in `getDeviceToken()` is deleted** (capability.ts).
   Registration now proceeds for a reader who deferred the prompt; the
   push-to-start token rides along and the card starts and updates with the
   prompt still unspent. Accepted consequence: deferring devices hold
   `device_tokens` rows, and banner sends to them are delivered-but-undisplayed
   (the backend already excludes carded devices from the goal fan-out).
   The **backend alternative** — making `token` optional and keying the row on
   `activityToken` — was considered and declined: schema + DTO + service
   changes in `senpai-backend` for what one deleted client-side check achieves.
   ⚠ One empirical assumption to confirm on hardware: `getDevicePushTokenAsync()`
   resolving with permission undetermined.
2. **The stale-closure bug is fixed with latest-value refs** (use-push-sync.ts):
   the token and sign-in effects subscribe once and read `prefsRef`/`localeRef`,
   so a late-arriving token can no longer re-register a stale snapshot and wipe
   the very token it delivers. (The cold-launch sync cannot fire pre-hydration
   — the root layout holds the tree until `hydratePreferences` resolves — so
   the wholesale-PUT-of-defaults door checked during this work is closed.)
3. **A never-landed registration retries on every foreground** — a second,
   deliberate `AppState` listener in `use-push-sync` (the re-arm effect's
   "one listener" rule guards against double re-arms, which this shares nothing
   with). It consults `readPushSyncStatus()` / `readLastRegistration()` and is
   free when redundant (`registrationChanged`). This is what picks up a
   permission granted later in Settings — previously that waited for the next
   cold launch.
4. **The account sheet tells the truth.** A new `usePushPermission` hook
   (foreground-refreshed) feeds the sheet's footnote: banner switches on +
   permission not granted → `alertsNoPermission`, a PRESSABLE line that spends
   the unspent prompt or opens Settings once it was spent. It OUTRANKS the
   sync report — "saved · 14:32" is now true of the registration while being a
   lie about the banners. ⚠ The planned `reason` enum on `push-sync-status`
   was dropped: with the gate deleted, `'no-token'` no longer means
   "no permission", so the store's no-reason-strings rule stands unbent and
   the truth comes from the permission state directly.
5. **Banner switches prompt; `alertGoals` never does.** Flipping
   reminder/moved/postponed ON in the account sheet with the prompt unspent
   asks right there — 0024's reserved "real prompt later". A fresh denial
   turns that switch back off (onboarding's honesty rule); an already-denied
   state does not ask (iOS would answer from the stored decision) — the note
   is the Settings doorway. `alertGoals` survives denial and never triggers
   the prompt: cards deliver without the permission, so the green switch is
   truthful as it stands (Ed's call, over 0024's blanket rule).

## Consequences

- The reported user's class of failure — defer the prompt, never get a card —
  is closed at registration time; her specific stale card is conclusively
  testable only on the next live matchday (quiet cycles, `stale-date`, and
  ADR 0083's capability strip remain the documented staleness candidates).
- Banner pushes to permission-less devices are spent sends. If the fleet grows
  and that cost matters, the truthful lever is server-side (skip banner types
  for rows whose client reported no permission) — a wire field this change
  deliberately did not add.
- `.claude/PUSH-AND-ACCOUNTS.md`'s "register after permission" rule is
  rewritten to point here.
- The fresh-install flows to verify on hardware: defer primer → follow a club
  → card arrives; flip a banner switch → prompt appears; deny → switch reverts;
  grant later in Settings → foreground re-sync registers without a relaunch.
