# Live Activities — BUILT 2026-08-28. ⚠ This file is the research, and parts of it are wrong

⚠⚠ **Status: no longer deferred.** It was built on 2026-08-28 —
[0055](./decisions/0055-live-activities-broadcast-channels.md) and
[0057](./decisions/0057-local-expo-module.md), with the backend's
`0034-live-activities-broadcast-channels.md`. **0055 is the authority; this file
is the research that preceded it and it is kept for its citations, not its
conclusions.**

⚠⚠ **THREE CLAIMS BELOW ARE WRONG AND COST TIME.** They are annotated inline, but
read them here first:

1. **"There is no token to put anywhere" (⭐ section below) is half true, and the
   wrong half.** Channels remove the per-activity UPDATE token. The
   **push-to-start** token is still required — nobody opens the app at kickoff —
   and it is per device and per activity TYPE, so it is one nullable column on
   `device_tokens`. Planned against "no token", this feature has no way to begin.
2. **"Raising the floor is almost certainly the right call" is wrong.**
   `targets/widget/` is ONE extension holding both widgets and both Lock Screen
   accessories; raising it to 18.0 would take the widgets away from every iOS 17
   reader, which is the exact cost [0047](./decisions/0047-widgets.md) paid 17.0
   to avoid. `@available(iOS 18.0, *)` at the call sites costs nothing. The floor
   did not move.
3. **The channel ceiling is 10,000 per app PER ENVIRONMENT**, not the small
   number "limited per app" implies below. Still finite, still leaking, still
   needs the prune — but the shape of the risk is different.

⚠ Also: the check-age footer is retired and **no stall line replaces it** — see
0055 §6. A card goes stale by the ABSENCE of pushes, so no push can carry that.

⚠ Every APNs host, path, header and status code was **verified against Apple's
provider documentation on 2026-08-28** while building. Where this file and
0034/0055 disagree on a wire detail, they are right.

Seeded from `senpai-backend/.claude/cronogol/live-phase-2.md` §2 and this repo's
`GO-LIVE.md`.

---

## Why it WAS not built, in one paragraph — ⚠ historical, it is built now

0024 deferred it because there was no live data. That reason is gone —
`/cronogol/live` carries a minute, a score and an event timeline, and
[0053](./decisions/0053-live-match-push-alerts.md) now ships goal, red-card and
full-time **push alerts** off it. What remains is not data. It is a different
APNs topic, a token that is not a device token, a design that does not exist, and
an update budget that is the easiest thing here to get catastrophically wrong.

⚠ **Do not tick this off by proximity to 0053.** Goal pushes landing is not Live
Activities landing. They share a data source and nothing else.

---

## Researched 2026-08-28 — the open questions, answered

The phase-2 notes said "check whether broadcast/channel push applies before
building the per-device path." **It applies, and it changes the design.**

### ⭐ Broadcast channels remove the token table

`GO-LIVE.md`'s named blocker was: *"there is nowhere to put an ActivityKit push
token — that is a new table, not a new column."*

⚠⚠ **WRONG — see the header. With channels there is no UPDATE token to put
anywhere; the push-to-start token is still a column.** Original text follows:

**With channels there is no token to put anywhere.** An activity subscribes with
`pushType: .channel(channelId)`; the server publishes one push to the channel id
and APNs fans it out to every subscriber. No per-activity token is stored, sent,
or refreshed. Apple's own guidance names this as the case it is for — *broadcast
updates for large shared events*, sports scores being the worked example.

One channel per fixture is the obvious mapping.

```swift
try Activity.request(
  attributes: MatchAttributes(fixtureId: id),
  content: .init(state: initial, staleDate: nil),
  pushType: .channel(channelId)      // ⭐ no token round-trip
)
```

### ⚠ iOS 18, not 17.2

Broadcast channels are **iOS 18+** (WWDC24). Push-to-start alone is 17.2.

⚠ `targets/widget/expo-target.config.js` sets `deploymentTarget: '17.0'`
**explicitly** — the plugin defaults to 18.0 and someone lowered it on purpose.
Channels mean raising that floor, or running two paths (channel on 18+,
per-device token on 17.x) which reintroduces exactly the token table channels
were meant to delete. **Raising the floor is almost certainly the right call**,
but it is a decision, not a detail.

⚠⚠ **WRONG — see the header.** Raising it removes the WIDGETS from iOS 17, which
this paragraph does not consider. 0055 gates at the call site and the floor stays
at 17.0.

### ⚠⚠ This one DOES need the Apple Developer portal

Unlike the time-sensitive entitlement — which EAS syncs from `ios.entitlements`
automatically — **the broadcast capability must be enabled by hand** in the
Developer Portal under Push Notifications. EAS capability sync does not cover it:
it is a setting on the push configuration, not an entitlement in the app.

### Channels are server-managed objects with a budget

- Created and deleted through APNs' **channel management API**, with the same
  token auth `apns-jwt.ts` already mints.
- ⚠ **10,000 active channels per app, PER ENVIRONMENT** (this file originally
  said only "limited per app"), and a channel cannot be used across environments. A channel outlives the
  activities on it, so a fixture channel left behind is permanent litter — the
  server has to delete them. `LiveSessionService.prune()` is the obvious home,
  beside the two prunes it already runs.
- Storage policy is chosen per channel: *most recent message* (deferred delivery
  to devices that were offline) or *no storage* (**a higher publishing budget**).
  For a score that is superseded every few minutes, no-storage is likely right.

### Still true, still the thing to get right

⚠⚠ **APNs is not a ticker.** Assume a small number of updates per hour and design
for discrete events — goal, half time, full time. `live-alert.policy.ts` already
emits exactly those, which remains the single reason this is now tractable.

### iOS 27 surfaces (WWDC26 session 223)

A Live Activity is no longer just Lock Screen + Dynamic Island. It now renders on
**Apple Watch Smart Stack, the macOS menu bar, CarPlay Dashboard and StandBy**.

- `.supplementalActivityFamilies([.small])` opts into the small family those
  surfaces use.
- ⚠ `isDynamicIslandLimitedInWidth` — iOS 27 landscape Dynamic Island is
  narrower; compact views must switch to a shorter alternative.
- `showsWidgetContainerBackground` / `activityBackgroundTint` control how the
  card looks when StandBy scales it up.
- `LiveActivityIntent` allows an action button on the activity itself.

⚠ **These are OPT-IN refinements, not requirements.** From iOS 18 / watchOS 11 an
iPhone Live Activity appears in the Watch Smart Stack **automatically, with no
code changes** — the system reuses the Dynamic Island's leading and trailing
views. `supplementalActivityFamilies` only replaces that automatic adaptation
with something purpose-built. Ship the Lock Screen and Dynamic Island; the other
surfaces follow for free and can be tuned later.

---

## The payload

`aps.event` (`start` / `update` / `end`), `aps.content-state`, `aps.timestamp`,
plus `stale-date` and `dismissal-date`.

⚠ `ApnsPayload` in `senpai-backend/src/apns/apns.types.ts` is a **closed
interface with no index signature** — deliberately, so a typo'd key cannot be
delivered silently. It has none of these members. Adding them is an edit to that
file, not a cast.

Headers, confirmed: `apns-push-type: liveactivity`, `apns-topic:
<bundleId>.push-type.liveactivity`, plus `apns-priority` and `apns-expiration`.
⚠ `apns.service.ts` hard-codes the first two.

---

## The clock is drawn, not pushed

⚠⚠ The minute on a Live Activity is rendered **client-side** from
`Text(timerInterval:)` over a date range. Pushing a per-minute update is the
budget mistake in item 4 wearing a different hat, and it is the single most
likely way to get this wrong.

The kickoff instant is already on the fixture. The activity needs the range, not
the tick.

---

## What the backend already has

The one genuinely hard part is **done**, and it was done for 0053:

- **A change detector.** `live-alert.policy.ts` decides which of the session's
  30-second cycles carried something worth interrupting a person for — goal, red
  card, the transition into full time. That is exactly the signal an activity
  update needs, and it is pure and unit-tested.
  ⚠ Without it, the obvious implementation forwards every cycle and exhausts
  the budget inside one half.
- **A per-event dedupe** (`live_push_sent`) that already answers "have we already
  told anyone about this moment".
- **Ending the activity.** Full time is already detected on the transition, once.
  An activity must be ended there with a dismissal date, or it sits on the lock
  screen after the match.

What is missing is the transport and the token store, not the decision of when to
send.

---

## The app side — ⚠ ALL OF THIS IS NOW DONE; kept for the reasoning

- ~~No `NSSupportsLiveActivities` in `app.json`.~~ Added (0055).
- ~~No ActivityKit target.~~ The widget extension at `targets/widget/` is where an
  `ActivityConfiguration` would live — it is already `deploymentTarget: '17.0'`
  and already carries the App Group.
- ⚠ **`Tokens.swift` is a hand-maintained copy of `theme.ts`** (HANDOFF trap 15)
  and would need whatever the Live Activity design uses.
- A `struct MatchAttributes: ActivityAttributes` sketch exists in
  `handoff_AG-ios/SPEC.md` §196-199. It is a sketch, not a design.

---

## The design ⚠ exists, and its premise expired

⚠ **Corrected 2026-08-28.** `handoff_live-notification` says the Live Activity
mocks are "not in this export" — true of *that* export, and misleading. They are
in **`handoff_AG-ios/SPEC.md` §4** (`### Live Activity (ActivityKit)`), with
`screenshots/16-live-activity-widgets.png`, options `1h`/`1i` in the explorations
file, and a `MatchAttributes` sketch. Compact, expanded and Lock Screen are all
specified.

⚠⚠ **But it was designed for a world with no live feed, and that is the whole
shape of it.** Its `ContentState` carries `lastCheckedMinutesAgo`, its footer
reads *"Checked 2h ago · no live feed yet"*, and it says the check-age *"is the
honest part of the design and must never be hidden."* That was right when the
only source was a 4-hourly sweep. `/cronogol/live` refreshes every ~30 s, so the
honest footer is now answering a question nobody is asking.

**The layout survives; the premise needs re-deciding.** What replaces the check
age — a live minute, a stall indicator per [0049](./decisions/0049-stall-is-lastseenat-not-polling.md),
or nothing — is a design decision, not a port.

Two smaller corrections to that spec: `fixtureId` is a **uuid string**, not an
`Int`; and `minuteLabel` as a server-sent string is now exactly right, since
`/cronogol/live` sends one.

---

## Gate — ⚠ STILL BINDING, and nothing about it changed

⚠ Nothing here starts before `CRONOGOL_LIVE_CRON_ENABLED` and
`CRONOGOL_LIVE_PUSH_ENABLED` are both on and verified on a real matchday. An
activity that pins a wrong score to a lock screen for ninety minutes is a worse
failure than a wrong banner, because it does not scroll away.
