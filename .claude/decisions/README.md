# Decision Log

One file per decision: `NNNN-short-slug.md`, numbered sequentially, never
renumbered. Superseding a decision means writing a **new** entry and marking the
old one `Superseded by 00NN`, not editing history.

## Template

```markdown
# NNNN — <Title>

- **Date:** YYYY-MM-DD
- **Status:** Accepted | Superseded by NNNN | Reversed
- **Decided by:** <who>

## Context
What forced a choice.

## Decision
What we're doing, stated plainly.

## Consequences
What this makes easy, what it makes hard, what it commits us to.

## Alternatives considered
Option — why not.
```

Keep entries short. A decision nobody could reconstruct from the code is worth
more words than one that's obvious once you see it.

## Index

| # | Decision | Status |
| --- | --- | --- |
| [0001](./0001-expo-sdk-57-managed.md) | Expo SDK 57, managed workflow | Accepted |
| [0002](./0002-expo-router-file-based.md) | expo-router with file-based routing | Accepted |
| [0003](./0003-src-directory-and-alias.md) | Code under `src/`, `@/` path alias | Accepted |
| [0004](./0004-typescript-strict.md) | TypeScript with `strict: true` | Accepted |
| [0005](./0005-native-tabs.md) | Native tabs via `expo-router/unstable-native-tabs` | Accepted |
| [0006](./0006-theme-constants-module.md) | Centralized theme constants, no styling library | Accepted |
| [0007](./0007-product-scope-tbd.md) | Product scope not yet defined | Superseded by 0012 |
| [0008](./0008-document-every-decision.md) | Every decision is recorded in this log | Accepted |
| [0009](./0009-backend-is-only-data-gateway.md) | `senpai-backend` is the only data gateway; `cronogol` is the reference implementation | Accepted |
| [0010](./0010-alta-gama-fc-repo-deprecated.md) | `alta-gama-fc` repo is deprecated | Superseded by 0011 |
| [0011](./0011-alta-gama-fc-repo-removed.md) | `alta-gama-fc` repo removed; deny rule dropped | Accepted |
| [0012](./0012-native-ios-port-of-cronogol.md) | Native iOS app porting `cronogol`, for App Store release | Accepted |
| [0013](./0013-atomic-design-components.md) | Atomic design for the component layer | Accepted |
| [0014](./0014-app-specific-design-language.md) | App-specific design language (in progress) | Resolved by 0015 |
| [0015](./0015-handoff-design-system-adopted.md) | Handoff design system adopted; theme module replaced | Accepted |
| [0016](./0016-ios-only-v1.md) | Web target dropped; iOS-only v1 | Accepted |
| [0017](./0017-react-query-data-layer.md) | React Query, with the web app's cache buckets as `staleTime` | Accepted |
| [0018](./0018-ported-data-layer.md) | The ported `lib/cronogol/` layer mirrors the web app path for path | Accepted |
| [0019](./0019-anonymous-v1.md) | Anonymous v1: follows are device-keyed, accounts designed-for | Superseded by 0038 |
| [0020](./0020-root-stack-wrapping-tabs.md) | Root layout is a `Stack` wrapping a `(tabs)` group | Accepted — sheets revised by 0030 |
| [0021](./0021-short-club-display-names.md) | Club names are shortened for display | Accepted |
| [0022](./0022-finished-today-from-fixtures.md) | `FINISHED TODAY` is built from `/cronogol/fixtures`, not the scoreboard | Accepted |
| [0023](./0023-phase-3-resequenced-no-apple-account.md) | Phase 3 resequenced around a pending Apple Developer account | Blocked half closed by 0024 |
| [0024](./0024-push-enabled.md) | Push enabled; Live Activity deferred to v1.1 | Accepted |
| [0025](./0025-widgets-deferred.md) | Widgets deferred; no native targets in the tree yet | Accepted — open work |
| [0026](./0026-apns-environment-is-the-provisioning-profile.md) | The APNs environment follows the provisioning profile, not the build name | Accepted |
| [0027](./0027-board-lead-cards-from-fixtures.md) | Today's live and last-result cards read `/cronogol/fixtures`; the scoreboard is not read by the app | Accepted |
| [0028](./0028-matchday-pager.md) | Matchdays pager: one clamped setter, text chevrons, no range while provisional | Accepted |
| [0029](./0029-upcoming-rows-read-from-the-followed-club.md) | `UPCOMING FROM YOUR CLUBS` rows are the crest pairing over `kickoff · day · venue`, with the relative day accented only today | Accepted |
| [0030](./0030-sheets-are-presented-by-the-root-stack.md) | The sheets are presented by the ROOT stack, not a `(sheets)` layout | Accepted |
| [0031](./0031-league-filter-tiles-are-artwork-only.md) | The league filter tiles are artwork only, at one fixed size | Accepted |
| [0032](./0032-clubs-browse-by-league.md) | Clubs browses one league at a time, behind the Matchdays filter row; search stays global | Accepted |
| [0033](./0033-player-detail-sheet.md) | Tapping a squad row opens a player sheet, read from the cached squad payload; a null keeps its label and blanks its cell | Accepted |
| [0034](./0034-next-up-card-live-seconds-countdown.md) | The next-up card leads with its crests and an accent versus ring; its countdown ticks per second, torn down while backgrounded | Accepted |
| [0035](./0035-jornada-rows-show-in-play-scores.md) | Jornada rows: 40pt `v` crest pairing, a clock-split timing column, and an in-play score captioned `In play`, never `LIVE` | Accepted |
| [0036](./0036-app-icon-appearance-variants.md) | The app icon is three 1024s wired through `ios.icon`'s variant object; the tinted variant must be opaque | Accepted |
| [0037](./0037-rich-notifications-server-composed-crests.md) | Rich notifications: the backend composes every crest; the app grows a service and a content extension | Accepted — verified on device |
| [0038](./0038-accounts-apple-and-google.md) | Accounts: Apple and Google, sign-in optional | Accepted |
| [0039](./0039-auth-goes-direct-to-supabase.md) | Auth goes direct to Supabase `/auth/v1`; the backend stays the only *data* gateway | Accepted — waypoint, proxied auth intended |
