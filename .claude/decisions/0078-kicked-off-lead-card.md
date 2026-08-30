# 0078 — The board holds a kicked-off match itself; the live row is a catch-up, not a trigger

- **Date:** 2026-08-30
- **Status:** Accepted — harness-proven; the flip not yet watched on a device
- **Decided by:** Ed Medina
- **Builds on:** [0052](./0052-kickoff-triggers-the-live-refetch.md) ·
  [0066](./0066-live-card-reads-the-live-route-directly.md)

## Context

Real Madrid v Málaga, LaLiga, 2026-08-30, scheduled 15:00 UTC. The next-up countdown
reached zero; the in-progress card did not appear; at 15:01 the board showed Barcelona v
Rayo (Monday) as NEXT UP and no trace of the match being played. The same report as
0066, one day after 0066 shipped.

Measured against production during the match:

| UTC | `GET /cronogol/live` |
| --- | --- |
| 15:04:15 | Andorra v Eibar only (`minute: 2`, seen 15:03:54) — **no Real Madrid row** |
| 15:04:26 | Real Madrid v Málaga appears: `status: live`, `minute: 0`, 0-0 |
| 15:05:28 | both rows; Real Madrid `minute: 2` |

**The backend was not wrong, it was late — and it will always be late.** LaLiga's own
feed flips a match to in-play at the *actual* whistle, which is routinely two to five
minutes after the scheduled kickoff. The countdown counts to the scheduled one. So every
match has a gap in which:

1. `routeLive` (tier 0, 0066) has no `status: 'live'` row to build from.
2. Any fresh `upcoming` fetch — a cold launch (the 15:01 screenshot), a pull-to-refresh,
   the fifteen-minute stale refetch — has dropped the match, because `upcomingBounds`
   starts at `now`. `next` then becomes the fixture *after* it. 0052's "never refetch
   `upcoming` at kickoff" guards only the countdown path; it cannot stop a remount.
3. On the countdown path the card sits on `00m 00s` until the row lands.

This also closes the open "minute lagged the wall clock" question from 0048 (`minute: 4`
at 17:07 on a 17:00 kickoff): the match started late. Not a backend question.

## Decision

**A third tier, between the route and the sweep: `kickedOff`** (`lib/cronogol/live.ts`).
A followed club's fixture that is still `scheduled`, not `kickoffTbd`, whose kickoff is
at most `KICKOFF_HOLD_MS` (2h30) in the past, and which the live route has never served.
It leads the board as an in-progress card with dashes for a score, no minute, no
`FeedAge`, no events disclosure, and `copy.today.kickedOffNote` — "Kicked off · waiting
for the first score update." The existing 15s live poll upgrades it in place the moment
the row appears; `routeLive` outranks it.

It reads the fixtures **already on screen** — `today` + `upcoming` + `recent`,
concatenated and deduped by id — so both paths work without a request:

- **Countdown path.** `upcoming` still holds the row. `onKickoff` now bumps a reducer
  first, synchronously, so the screen re-renders with a `now` past the kickoff and the
  card flips on that render; the three refetches follow as before.
- **Cold mount inside the gap.** `todayBounds` ends at `now`, so the fixture is in
  `finished.data` with `status: 'scheduled'`.

**`next` and the upcoming band exclude any fixture whose kickoff has passed**
(`upcomingMine` in `index.tsx`). Without this a match the kicked-off tier is holding, or
one that just ended, came back as NEXT UP over a `00m 00s` countdown the moment the
live card stepped aside. A TBD kickoff is never compared (0029). This does not change
`next.kickoffUtc` for a fixture still upcoming, so 0052's no-loop rule holds; when the
started match leaves `next`, its `Countdown` unmounts.

**`seenLive` — a per-session set of every fixture id the route has served — is the
post-match guard.** After full time the live row vanishes, but `today` can be fifteen
minutes stale and still say `scheduled`, which is exactly the shape the new tier holds.
A fixture the route has ever served is never held again. The same vanishing is the one
signal that a match has ended before the sweep says so, so it also refetches `today` and
`recent` once per fixture, which is what moves the score onto the last-result card.

`BoardLive` gains a `source: 'route' | 'sweep' | 'kickoff'` discriminator; `live` alone
could not tell the sweep's stale flag from a match nobody has reported on, and the two
need different captions.

## Consequences

- The card is honest by construction: it claims a kickoff time that is a published
  fact, and nothing else. No score, no minute, no "live".
- **A non-LaLiga club holds the kicked-off card for up to 2h30**, or until the ~3h sweep
  flips the fixture — the live route covers LaLiga only. That is true (the match *has*
  kicked off) but a Premier League reader will see "waiting for the first score update"
  for most of a match. If it reads badly, the remedy is a second string naming the
  sweep cadence for that path, not hiding the card.
- `next` and `mine` are no longer memoised; they read the clock, and a memo with `now`
  in its deps recomputes every render regardless (the same argument `board` already
  makes).
- A postponed match whose stored status is still `scheduled` would be held for 2h30
  after its old kickoff. The sweep normally writes `postponed` well before the day; if
  it does not, the hold expires on its own.
- `/_debug/gallery` fabricates its live rows and passes no `awaitingUpdate`; unchanged.
