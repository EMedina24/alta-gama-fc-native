# Scope & Purpose

## What this app is

The **native iOS app for Alta Gama FC**, built with Expo / React Native, with the
goal of being **published on the Apple App Store**.

It ports the functionality of the web app ([`cronogol`](./ECOSYSTEM.md), serving
`altagamafc.com`) onto native, and reads all of its data from
[`senpai-backend`](./ECOSYSTEM.md). It is a **new client on an existing product**,
not a new product.

## The three pillars

| Pillar | Decision |
| --- | --- |
| **Data** — everything from `senpai-backend`; never a provider or Supabase directly | [0009](./decisions/0009-backend-is-only-data-gateway.md) |
| **Functionality** — ported from `cronogol`, which stays the behavioral reference | [0012](./decisions/0012-native-ios-port-of-cronogol.md) |
| **Design** — **new and app-specific**, not a port of the web look | [0014](./decisions/0014-app-specific-design-language.md) |

The split matters: **behavior is inherited, appearance is not.** When reading
`cronogol` for guidance, take the logic, the data handling, the edge cases and the
empty states — leave the styling.

## Component architecture

Atomic design — `atoms/` → `molecules/` → `organisms/`, structurally similar to
how `cronogol` decomposes its components. See
[0013](./decisions/0013-atomic-design-components.md) and
[CONVENTIONS.md](./CONVENTIONS.md).

## Platform targets

| Target | Status |
| --- | --- |
| **iOS** | **Primary.** App Store publication is the goal. |
| Android | Expo supports it for free; not a stated goal. Don't add iOS-only APIs without a fallback, but don't spend effort on Android polish yet. |
| Web | **Out of scope** — `cronogol` already owns the web. The scaffold still builds it; see the open question below. |

## Outstanding front-end work

The five screens run on live data, but several designed states are unbuilt —
most notably **the Today board's live and last-result cards**, whose organisms
exist but are never passed data, which means the score-age honesty line has never
rendered in the app.

Full audited list: [HANDOFF.md § Front-end work outstanding](./HANDOFF.md).

## Open questions

- **Feature scope for v1.** The web app covers fixtures, standings, squads, news
  and editorial, accounts, and `.ics` calendar feeds. Which land in v1?
- **The native-only justification.** Push notifications for kickoffs and goals are
  the obvious one. **Partly resolved 2026-08-24:** the backend now has a full
  fixture-change push subsystem (moved/postponed alerts, device registration —
  see [PUSH-AND-ACCOUNTS.md](./PUSH-AND-ACCOUNTS.md)), shipped dark until the
  Apple Developer account exists. **Goal/live-score push remains absent** — but
  ⚠ **its stated reason expired on 2026-08-27.** The backend now HAS a live
  feed: `GET /cronogol/live` carries in-play status, score and a MINUTE,
  refreshed every ~30s during a match (LaLiga only —
  [LIVE-SCORES.md](./LIVE-SCORES.md)). What is still missing is the
  *delivery* half — no websocket, no goal push — which makes APNs Live
  Activities a real phase-2 option rather than the non-starter it was.
- **Accounts on day one?** (`/cronogol/me`, claimed feeds, passkeys.)
- **Calendar:** subscribe natively to the existing `.ics` feeds, or integrate with
  the device calendar directly?
- **Localization.** Primary market is Spain; `cronogol` has an `i18n` layer.
  Spanish, English, or both at launch?
- **Drop the web target?** Removing it simplifies the component layer (no more
  `.web.tsx` splits) — but it is currently load-bearing in the scaffold.
- **App Store prerequisites** not yet started: Apple Developer account, bundle
  identifier, EAS Build setup, privacy nutrition labels, and an
  account-deletion path if accounts ship (Apple requires one).

## Not in scope

- Rebuilding or replacing the web app.
- Talking to Supabase, Hygraph, or any football provider directly.
- Anything on the Senpai Supply Co. side of `senpai-backend` — that surface is
  deliberately frozen at order lookup.
