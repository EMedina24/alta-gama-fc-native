# 0055 — Live Activities ship on broadcast channels, gated at the call site rather than the target

- **Date:** 2026-08-28
- **Status:** Accepted — shipped dark behind the backend's `CRONOGOL_LIVE_ACTIVITY_ENABLED`
- **Supersedes:** [0054](./0054-live-activities-still-deferred.md)
- **Builds on:** [0024](./0024-push-enabled.md), [0047](./0047-widgets.md),
  [0049](./0049-stall-is-lastseenat-not-polling.md),
  [0053](./0053-live-match-push-alerts.md), [0057](./0057-local-expo-module.md)
- **Backend twin:** `senpai-backend/.claude/decisions/0034-live-activities-broadcast-channels.md`

## Context

0054 deferred Live Activities on four grounds and then corrected one of them in
an update. Building the thing found two more of its claims wrong, and both would
have cost something real.

0053's `live-alert.policy.ts` is why this is tractable at all: it decides which
30-second cycle carried a moment worth interrupting someone for. ⚠⚠ **Apple
budgets Live Activity updates, and the obvious implementation — forward every
cycle — exhausts the budget inside one half.**

## Decision

### 1. Broadcast channels, iOS 18+

The activity subscribes to a per-fixture channel; the server publishes once and
APNs fans out. Rejected alternative: per-activity update tokens (iOS 17.2+),
which reach iOS 17 but require the app to **wake in the background on every
start** to report a token — every missed wake being a card that never updates,
silently.

### 2. ⚠⚠ The widget target stays at `deploymentTarget: '17.0'`

**0054 and `.claude/LIVE-ACTIVITIES.md` both say to raise it to 18.0, and both
are wrong.** `targets/widget/` is ONE extension holding both home-screen widgets,
both Lock Screen accessories, and now the activity. Raising its floor for the
activity would silently remove the WIDGETS from every iOS 17 reader — the exact
cost [0047](./0047-widgets.md) paid 17.0 to avoid.

`ActivityConfiguration` and every channel call are `@available(iOS 18.0, *)`
instead, with `if #available` in `AltaGamaWidgetBundle`. Availability gating
costs nothing and keeps 0047 intact.

### 3. ⚠⚠ The push-to-start token is a `device_tokens` COLUMN, not nothing

**`.claude/LIVE-ACTIVITIES.md` says "there is no token to put anywhere". That is
half true, and the half it gets wrong is the half that starts the feature.**
Channels remove the *update* token. Starting a card on a locked phone with the
app closed still needs `Activity.pushToStartTokenUpdates`, and nobody opens the
app at kickoff.

It is per device **and per activity type** — not per activity — so it is one
nullable column, not the table `GO-LIVE.md` feared. Absent is the ordinary case.

⚠ It is **not** the 64-hex device token and is materially longer, so it gets its
own `normaliseActivityToken` and its own DTO regex. Running `normaliseToken` over
it discards every real token, silently, in a function that already returns null
for legitimate reasons.

### 4. The card replaces the banner

A `liveactivity` push carries `aps.alert`, so the update banners *and* moves the
card. The backend excludes devices with a running card from the 0053 fan-out —
one interruption per moment rather than two, thirty seconds apart, for ninety
minutes. The failure mode is stated in the backend's 0034.

### 5. Consent reuses `alertGoals`

No fifth switch, no preferences v4, no new copy. `alertGoals` already means "this
match may interrupt me", and it already defaults off.

### 6. ⚠ The check-age footer is retired

SPEC §196's footer reads `Checked 2h ago · no live feed yet` and the spec calls
the age *"the honest part of the design"*. That was right against a 4-hourly
sweep. Against a 30-second feed it answers a question nobody is asking.

It is replaced by **the last alertable moment** — `67' Nico Williams` — which is
what the reader actually wants from a card they glance at.

⚠⚠ **And it is NOT replaced by a stall line, though the plan said it would be.**
A first draft carried `stalledLabel` on the model of [0049](./0049-stall-is-lastseenat-not-polling.md).
It cannot work: `ContentState` only changes when a push arrives, and a card goes
stale by the ABSENCE of pushes — the one moment the flag would need to flip is
the one moment nothing is being sent. `aps.stale-date` is the mechanism, and iOS
greys the card itself on its own clock.

### 7. ⚠⚠ Every string on the card arrives PRE-LOCALISED, and the target gets no `.lproj`

The card is drawn by the **widget** extension, which renders in the SYSTEM
language and cannot see the language chosen inside the app. A `.lproj` here would
hand an English card to a Spanish reader on an English phone — precisely the bug
0047 kept out of the widgets. The widgets solve it with pre-resolved copy in the
App Group snapshot; an activity has no snapshot, but its content comes from a
server push and the server knows `device_tokens.lang`.

⚠ So `consequenceLabel` travels as a SENTENCE here and as a TOKEN to the
long-look card, and that asymmetry is deliberate — the two extensions know
different things.

### 8. ⚠⚠ Every instant on the wire is EPOCH SECONDS, never an ISO string

`ContentState.clockFrom` and `MatchAttributes.kickoffUtc` were first declared as
Swift `Date`s against ISO strings from the server. **That is a decode failure.**
`JSONDecoder`'s default date strategy is `.deferredToDate`, which expects a
number of seconds; ActivityKit decodes this state itself and does not document
its strategy, so the safe assumption is the default.

⚠ And a decode failure here is total and silent: the whole payload is dropped,
score included, with no error anywhere and nothing on the phone. It presents
exactly like "the card never started".

So the wire carries `clockFromEpoch` and `kickoffEpoch` as numbers, and the Swift
exposes computed `Date` accessors over them. A primitive both sides agree on
cannot fail that way. `live-activity.mapper.spec.ts` asserts no ISO string
survives anywhere in a start payload.

### 9. Two corrections to SPEC §196 while transcribing it

- `fixtureId` is a **uuid string**, not an `Int`.
- `ContentState.lastCheckedMinutesAgo` is gone with the footer.

## Consequences

- ⚠ **iOS 18+.** A reader on 17.x keeps the 0053 banners and gets no card, and
  the UI says nothing about it. Deliberate: the alternative is a settings row
  explaining an Apple version floor, which helps nobody who cannot act on it.
- ⚠ **One language per channel.** A broadcast reaches every subscriber with
  identical bytes, so an English reader gets an English banner and a **Spanish
  card**. Recorded in the backend's 0034 §6.
- ⚠ `MatchAttributes.swift` lives in `targets/_shared/` and reaches the app
  target through the local module's podspec — see [0057](./0057-local-expo-module.md).
- ⚠ **LaLiga only**, still. `LiveScoreProviderRegistry` has one member and the
  switch's `LaLiga only, for now` note stays load-bearing.
- ⚠ The live event feed is **still unverified against a real scorer**
  (`.claude/LIVE-SCORES.md` §6). Bad attribution on a card that sits there for
  ninety minutes is worse than a wrong banner, because it does not scroll away.
- ⚠ **`.claude/LIVE-ACTIVITIES.md` and 0054 both carry claims this decision
  corrects** (§2 and §3 above). Both have been annotated rather than edited.
- **Verified 2026-08-28:** the broadcast capability is enabled on
  `com.altagamafc.app` and `node scripts/probe-apns.mjs --channel` completes a
  create (201, with a channel id) / delete (204) round-trip against the sandbox
  management host. ⚠ That proves the capability, the JWT and the prune path —
  and nothing downstream of a device token.
