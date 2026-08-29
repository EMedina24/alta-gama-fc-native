# 0066 — The live card reads `/cronogol/live` directly; the fixture-window join is a fallback

- **Date:** 2026-08-29
- **Status:** Accepted — harness-proven, not yet seen against a real kickoff
- **Decided by:** Ed Medina
- **Revises:** [0048](./0048-live-scores-on-the-today-board.md) decision 2 (the
  `fixtureId` join) · **Builds on:** [0052](./0052-kickoff-triggers-the-live-refetch.md)

## Context

Levante v Real Betis, LaLiga, 2026-08-29 15:00 UTC. The next-up card counted down to
`00m 00s` and stayed there; the in-progress card never appeared and the match ended 5-2.

The backend had watched the whole match — `GET /cronogol/fixtures/{id}/events` holds
every goal from 24' on, written by the live session — so the route almost certainly
served a `live` row. The app could not show it, and 0052's own trigger is why:

1. `boardLive` (0048 decision 2) only ever upgraded a fixture the board **already held**,
   from the `today` or `recent` window. Both windows end at `now`, with an exclusive `to`.
2. 0052 made the countdown refetch those windows at kickoff — **once**. The countdown's
   tick is aligned to the wall second and fired on `at >= target`, so its refetch could
   carry `to` equal to the kickoff to the millisecond. Measured against production:
   `to=15:00:00.000Z` returns **zero** fixtures for a 15:00:00 kickoff; `.001Z` returns
   it. A one-shot with a zero-millisecond margin.
3. When that shot misses, nothing re-asks: `STALE.feed` is fifteen minutes, there is no
   interval, and `refetchOnWindowFocus` is off globally. The live poll ran every fifteen
   seconds for ninety minutes with a perfect row and nothing to join it to.

HANDOFF already named the real fix under "KNOWN GAP — the card is hostage to the fixture
window": the live row carries `fixtureId`, both slugs, both names, `shortName`, kickoff,
score and minute. The only thing the fixture ever added was crests.

## Decision

1. **Tier 0: `routeLive()` picks the card from the live route alone.** A followed slug on
   either side, `status === 'live'`, earliest kickoff wins. Freshness stays `liveById`'s
   job. No fixture window is consulted.
2. **Crests come from the club catalogue.** `teamRefFromLive()` builds the card's
   `TeamRef` from the live row plus `useTeams()` (24h, already on the screen) by slug; a
   club the catalogue lacks gets `null` crests and the monogram fallback.
3. **`BoardLive.fixture` narrows to `BoardFixture`** — `id`, the two `TeamRef`s,
   `kickoffUtc`, `goalsHome`, `goalsAway`. That is all `liveCard()` and the events panel
   (0050/0051) read. A `WindowFixtureView` still satisfies it, so tiers 1 and 2 are
   untouched and the sweep path for non-LaLiga leagues is exactly as it was.
4. **The countdown fires strictly past kickoff** (`at > target`). The tick that lands on
   the kickoff millisecond falls through to one more ordinary tick a second later, so the
   refetch's `to` is always at least a second past the kickoff. The once-per-target guard
   and the `AppState` resume path are unchanged.
5. **0052's refetch stays.** It is no longer what puts the live card on screen, but it is
   still what brings the fixture into FINISHED TODAY and, at full time, the LAST RESULT
   card. Its "never `upcoming`" rule still holds for the reasons 0052 gives.
6. **`liveMinute()` returns `null` for a literal `0`** — LIVE-SCORES.md §4 forbade `0′`
   and the null case was guarded while the zero was not.

## Consequences

- The card appears within one live poll (≤15s) of the route flipping to `live`, whatever
  state the fixture windows are in. Pull-to-refresh is no longer a workaround for anything
  on this path.
- Tier 1 is now effectively never the winner — any row it could match, tier 0 already did.
  Kept because it costs nothing and its harness assertions still hold.
- Nothing here changes what non-LaLiga clubs get: tier 2, the sweep, the `FeedAge` line.
- The window boundary is now recorded as HANDOFF trap 39; the refetch is no longer
  load-bearing for the card, but the boundary is real and will bite anything else that
  fires a window request on an event aligned to a kickoff.
- ⚠ Goal push alerts are a **separate, backend** matter and are not fixed by this: the
  backend's `LivePushService` sends nothing until `CRONOGOL_LIVE_PUSH_ENABLED` is `'true'`
  on Render (`render.yaml` ships `'false'`; the documented gate is a matchday of
  `[dry-run] live push` log lines), and the app's `alertGoals` defaults off (0053).

## Alternatives considered

- **Retry the window refetch on an interval after kickoff until a card appears.** Spends
  requests to re-learn something the live route already states in one body, and keeps the
  card hostage to a window that has no reason to be involved.
- **Fire the refetch with `to = now + 1s`.** Fixes the boundary, not the dependency; the
  card would still need the window to have the row.
- **Drop `to` from the today/recent windows.** Rejected in 0052 for what it does to
  FINISHED TODAY; still true.
