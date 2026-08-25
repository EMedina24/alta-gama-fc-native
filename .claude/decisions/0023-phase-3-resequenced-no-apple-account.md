# 0023 — Phase 3 resequenced around a pending Apple Developer account

- **Date:** 2026-08-24
- **Status:** Accepted
- **Decided by:** Ed Medina

## Context
The Apple Developer Program membership is applied for and pending. Until it is
approved: no App Store Connect, no TestFlight, and **no entitlement-gated
capabilities** — which includes Push Notifications and App Groups.

[The plan](../../.claude/PROJECT.md) assumed the account would be in hand for
Phase 3. Three of its items depend on it, and two of those are not partially
doable: an entitlement either exists or it does not.

## Decision
Split Phase 3 by entitlement rather than by feature, and build the whole
unblocked half now.

### Blocked until approval
| Item | Why |
| --- | --- |
| `PUT /cronogol/push/device` registration | `getDevicePushTokenAsync()` needs the **aps-environment** entitlement. No entitlement, no APNs token, nothing to register. |
| Widgets (WidgetKit) | Needs an **App Group** to share the snapshot, which needs a provisioning profile. |
| Live Activity | Needs the widget extension, and the full SPEC §4 version needs a push token the API cannot accept anyway. |
| TestFlight / store metadata | App Store Connect access. |

⚠ Note this is *not* only a build-signing problem. Even the server side is dark
(`CRONOGOL_PUSH_CRON_ENABLED='false'`, APNs vars unset), so push was never going
to deliver end-to-end in this phase — the account gates both halves.

### Unblocked, and being built now
- **Calendar sheets** — `webcal://`, the Google `cid` link, `.ics` snapshot,
  clipboard copy. Four `Linking.openURL` calls and one clipboard write; **no
  permission prompt and no entitlement**. Deliberately NOT `expo-calendar`.
- **Matchday feed sheet** — the same, for a jornada feed.
- **Alerts sheet** — the confirm/unsubscribe flow. The follow state it writes is
  device-local and already works; only the network call behind it is deferred.
- **Account sheet** — identity slot, alert types, preferences, feeds, destructive
  action. In an anonymous v1 (ADR 0019) none of it needs auth.
- **Onboarding** — club picker and the alert primer. ⚠ The primer explains and
  then asks; the permission request itself is the last step and is the only part
  that waits.
- **Deep-link routing** — `altagamafc://club/{slug}`. A custom URL scheme is
  Info.plist, not an entitlement, so this is testable today with `simctl openurl`.

`expo-notifications` is **not installed yet**. Installing it costs Expo Go for
every remaining screen and buys nothing while the entitlement is missing.

## Consequences
- The app stays runnable in **Expo Go** through the whole unblocked half, which
  keeps the iteration loop fast.
- Every deferred item has its UI built and its state wired; what is missing is one
  network call and one native target. The alert-type switches persist to the
  preferences store today and become the `PUT` body unchanged.
- ⚠ The alert switches must not imply alerts are arriving. Copy states that alerts
  turn on when the app is released — the same honesty rule the score-age line
  follows, applied to a different gap.
- Sequencing risk noted in the plan is now realised: the widgets that would have
  been the strongest **Guideline 4.2** answer for a ported web app are the items
  most firmly blocked. They come back the day the account clears.
