# 0052 — Kickoff triggers the board's refetch, and window bounds move into the `queryFn`

- **Date:** 2026-08-28
- **Status:** Accepted
- **Decided by:** Ed Medina
- **Builds on:** [0034](./0034-next-up-card-live-seconds-countdown.md) (the
  countdown), [0048](./0048-live-scores-on-the-today-board.md) (the live card)

## Context

Reported from a device: the next-up card counted down to `00m 00s` and **stayed
there**. The match kicked off, `/cronogol/live` was polling every fifteen
seconds, and the in-progress card never appeared.

The poll was not the problem. The join was — and it could not have succeeded:

1. `boardLive` tier 1 upgrades a fixture the board **already holds**, matching
   `byId.get(fixture.id)?.status === 'live'`. It needs a fixture row.
2. The only two windows the board holds are `todayBounds` — `[local midnight,
   now]` — and `recentBounds` — `[midnight-14d, now]`. **Both end at the instant
   they were fetched**, and `to` is exclusive on `/cronogol/fixtures`
   (HANDOFF trap 5).
3. So a match kicking off at 15:30, in an app whose today-window was fetched at
   15:29, is **outside every window on the screen**. `/cronogol/live` could hold
   a perfect row for it and there was nothing to join it to.
4. Nothing refetched those windows either: `STALE.feed` is fifteen minutes and
   neither query carries an interval. The board sat there.

A second defect sat behind the first. `useFinishedToday` and friends computed
`from`/`to` **during render** and closed over them in the `queryFn`. This screen
only re-renders when a query settles, so a `refetch()` fired at kick-off would
have re-asked for a window computed up to fifteen seconds earlier — **which still
ends before the match starts.** The fix that looks obvious would have failed on
its own bounds.

## Decision

1. **`Countdown` announces kick-off.** A new optional `onElapsed` fires once per
   target, the moment the card observes the instant has passed — on the tick that
   crosses it, or on the mount or resume that finds it already behind us. The
   timer was already counting to precisely that moment; nothing else on screen
   knows it happened.
2. **Already-elapsed fires too.** A reader who switches tabs at kick-off minus
   one and returns at plus one is exactly the case this exists to repair.
3. **`MatchBoard` forwards it as `onKickoff`** rather than the next-up card
   owning a query. Data fetching stays at organisms and above (0013), and the
   board is where the design put the countdown.
4. **The Today screen refetches `finished`, `recent` and `live` — never
   `upcoming`.** Two reasons, and the second is load-bearing:
   - `upcomingBounds` starts at `now`, so refetching it **drops the match that
     just kicked off**. Until the live row lands — the backend re-reads every
     ~30s — the board would swap this card for the match *after* it, which reads
     as the fixture having vanished.
   - `next` is fed by `upcoming` alone. Leaving it untouched is what makes this
     provably loop-free: nothing the callback fires can change `next.kickoffUtc`,
     re-arm the countdown's once-per-target guard and fire again.
5. **One shot, not a burst.** `useLive` already polls every fifteen seconds while
   the screen is focused. What it lacked was the fixture; that arrives with the
   two window refetches, and the next poll completes the join.
6. **Window bounds are computed inside the `queryFn`, at request time.** The
   query KEY still comes from a render-time `from` and is still keyed to the DAY,
   so no new cache entry is minted per second. Applied to all four windows
   (`today`, `upcoming`, `widget`, `recent`) — the frozen-bounds defect is
   identical in each, and leaving three of them wrong would only wait.

## Consequences

- The board flips to the in-progress card within roughly one live poll of
  kick-off — the fixture arrives immediately, the live row on the next ~15s tick,
  bounded below by the backend's own ~30s sweep.
- `refetch()` on any fixture window now means "the window as of now", which is
  what every call site already assumed. Pull-to-refresh gets fractionally fresher
  data as a free side effect.
- **Non-LaLiga leagues are unchanged and still land on tier 2**, which needs
  `status: 'live'` from a sweep up to three hours old. Kick-off refetches their
  window too, but the sweep will usually still say `scheduled`; that card
  arriving late is the sweep's latency, not this path's, and it keeps its
  `FeedAge` line saying so.
- One more thing depends on the device clock. It already did — 0034 put the
  countdown itself there, and the trap-8 carve-out covers it: a wrong device
  clock now costs a few early or late requests on top of a wrong countdown.
- The next-up card can still sit at `00m 00s` — when the live route has no row
  yet, or has none at all for that league. That is honest and unchanged; what is
  fixed is that it is no longer *permanent*.

## Alternatives considered

- **Poll the fixture windows on an interval while a kickoff is near.** Spends
  requests through the whole pre-match hour to learn something arithmetic already
  knows to the second.
- **Refetch `upcoming` as well.** Rejected on decision 4 — it makes the fixture
  disappear during the gap and reopens the loop the guard is protecting.
- **Drop `to` from the today/recent windows so they run to end-of-day.** Would
  fix the join without a trigger, but it changes what FINISHED TODAY counts (rows
  that have not been played yet enter its window) and asks the API for a band
  nothing on the screen renders.
- **Let `Countdown` own a `refetch`.** Fetching below the organism layer, against
  0013, and it would make the molecule untestable in the gallery.
