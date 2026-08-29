# 0054 — Live Activities remain deferred; the phase-2 path is written down

- **Date:** 2026-08-28
- **Status:** ⚠ **Superseded by [0055](./0055-live-activities-broadcast-channels.md)** — built 2026-08-28
- **Decided by:** Ed Medina
- **Builds on:** [0024](./0024-push-enabled.md) (the original deferral),
  [0047](./0047-widgets.md), [0053](./0053-live-match-push-alerts.md)

## Context

0024 deferred Live Activities to v1.1 because there was no live data. 0053 has
now shipped goal, red-card and full-time **push alerts** off the live feed, which
removes that reason and invites the obvious question: if the data is there, why
not the Dynamic Island?

`GO-LIVE.md` named three blockers. Two are now spent and one is not:

- ~~`minuteLabel` has no source~~ — `/cronogol/live` carries a minute.
- **There is nowhere to put an ActivityKit push token.** Still true, and it is
  not a column: the token is per-**Activity**, not per-device, so it is a new
  table with a fixture, a device and a lifetime.
- **A local notification cannot start an activity while backgrounded.** Still
  true; push-to-start is required, which is a different APNs topic.

## Decision

**Defer.** 0024's conclusion stands, for reasons that are now specific rather
than "no data":

1. **`ApnsService` hard-codes `apns-push-type: 'alert'` and one topic.** A Live
   Activity needs `liveactivity` and `<bundleId>.push-type.liveactivity` — a
   *different* topic from the one every push today is sent on.
2. **`ApnsPayload` is a closed interface** with no `aps.event`,
   `content-state`, `timestamp`, `stale-date` or `dismissal-date`.
3. **⚠⚠ Apple budgets frequent updates, and this is the way to get it wrong.**
   The live session writes every 30 seconds. Pushing every cycle would exhaust
   the budget inside one half. It needs a **change detector, not a tick
   forwarder** — and 0053 built exactly that (`live-alert.policy.ts`), which is
   the single largest reason phase 2 is now tractable.
4. **No design exists.** The handoff states plainly that the Live Activity and
   Dynamic Island mocks were part of the same exploration and are **not** in the
   export. Ask for them before scheduling the work.

The path is written down in [`.claude/LIVE-ACTIVITIES.md`](../LIVE-ACTIVITIES.md)
so the next person does not re-derive it.

## Consequences

- 0024's deferral is reaffirmed, not superseded. ⚠ **Do not tick this by
  proximity to 0053.** Goal pushes landing is not Live Activities landing; they
  share a data source and nothing else.
- The clock on a Live Activity is rendered client-side from
  `Text(timerInterval:)`. ⚠ Never push a per-minute update — that is the budget
  mistake in item 3 wearing a different hat.
- Whether **broadcast/channel push** applies was left unresolved here. It has
  since been answered — see the update below.

---

## Update — 2026-08-28: the token blocker is gone

⚠ **The decision above is unchanged — Live Activities stay deferred.** What
changed is that its second blocker no longer exists, so the deferral now rests on
design and deployment-target grounds rather than on a missing token store.

**Broadcast channels (iOS 18+, WWDC24) remove the per-Activity token entirely.**
An activity subscribes with `pushType: .channel(id)`; the server publishes once
to a channel id and APNs fans it out. There is no token to store, so the "new
table, not a new column" blocker named in `GO-LIVE.md` and in item 2 above is
void. Apple names shared sporting events as the case channels exist for.

Three things replace it, none of them blocking today:

1. ⚠ **iOS 18 floor.** `targets/widget/expo-target.config.js` pins
   `deploymentTarget: '17.0'` deliberately. Channels need 18. Raising it is a
   decision in its own right; running both paths reintroduces the token table.
2. ⚠ **The broadcast capability is a MANUAL Apple Developer portal step** — the
   one thing in this feature EAS capability sync does not cover.
3. ⚠ **Channels are limited per app and outlive their activities**, so the server
   must delete them through APNs' channel management API.

⚠ **Item 4 above is wrong and is corrected here: a design DOES exist.**
`handoff_AG-ios/SPEC.md` §4 specifies the compact, expanded and Lock Screen
presentations. The live-notification handoff's "not in this export" refers only
to its own export. ⚠ That design is built around *not* having a live feed — its
footer is a check-age, "the honest part of the design" — so its premise needs
re-deciding against a 30-second feed, but its layout stands.

⚠ The new iOS 27 surfaces (Watch, menu bar, CarPlay, StandBy) are **opt-in
refinements, not requirements** — the Watch Smart Stack adapts the Dynamic Island
views automatically with no code.

Detail and citations: [`LIVE-ACTIVITIES.md`](../LIVE-ACTIVITIES.md).

---

## Update — 2026-08-28: BUILT, and two of this entry's claims were wrong

⚠ **This decision is superseded by [0055](./0055-live-activities-broadcast-channels.md).**
Nothing above is edited — the reasoning is left as it stood — but two claims in
it, and in `LIVE-ACTIVITIES.md`, cost real time to disprove and must not be read
forward.

### ⚠⚠ 1. "The token blocker is gone" is HALF true, and the wrong half

The first update above says broadcast channels *"remove the per-Activity token
entirely"* and that *"there is no token to store"*. Channels remove the
**update** token. They do not remove the **push-to-start** token, and that is the
one that starts the feature: nobody opens the app at kickoff, so the server must
be able to start a card on a locked phone with the app closed.

It is per device **and per activity type**, so it is one nullable column on
`device_tokens` — much cheaper than the table `GO-LIVE.md` feared, but not zero.
Planned against "no token", this feature has no way to begin.

### ⚠⚠ 2. "Raising the deployment floor is almost certainly the right call" is wrong

The first update, and `LIVE-ACTIVITIES.md`, both frame `targets/widget/`'s
`deploymentTarget: '17.0'` as a floor that channels require raising to 18.

`targets/widget/` is **one extension** holding both home-screen widgets and both
Lock Screen accessories. Raising it to 18 for the activity would silently take
the WIDGETS away from every iOS 17 reader — the exact cost
[0047](./0047-widgets.md) deliberately paid 17.0 to avoid, and the doc frames it
as a detail about the activity alone.

`@available(iOS 18.0, *)` on the `ActivityConfiguration` and `if #available` in
the widget bundle cost nothing and keep 0047 intact. **The floor did not move.**

### Also corrected in 0055

- The check-age footer is retired, and **no stall line replaces it** — a card
  goes stale by the absence of pushes, so no push can carry that fact.
- Item 4 above ("no design exists") was already corrected in the first update.
- Apple's channel ceiling is **10,000 per app per environment**, not the small
  number `LIVE-ACTIVITIES.md` implies.
