# 0048 — Live scores upgrade the Today board's in-progress card

- **Date:** 2026-08-27
- **Status:** Accepted — verified against a real in-play match 2026-08-28. **Decision 2 (the `fixtureId` join) revised by [0066](./0066-live-card-reads-the-live-route-directly.md)** — the card now reads the live route directly; the join is the fallback
- **Decided by:** Ed Medina

## Context

`senpai-backend` shipped `GET /cronogol/live` on 2026-08-27
(`senpai-backend/CRONOGOL.md` §97, its `decisions/0031`). It is the first genuinely
live data this product has ever had, and it lands in an app that was deliberately
built to deny liveness exists — see [.claude/LIVE-SCORES.md](../LIVE-SCORES.md),
written as the brief for this change.

Two properties make it categorically different from `/cronogol/scores`:

| | `/cronogol/scores` | `/cronogol/live` |
| --- | --- | --- |
| Refresh | every ~4h | every ~30s, during matches only |
| Joins to a fixture | ❌ never (opta-keyed) | ✅ `fixtureId` + our own team slugs |
| Minute of play | ❌ | ✅ |
| Coverage | every competition the source carries | **LaLiga only** |
| Liveness trustworthy | **no — keep suppressing** | yes |

The board already has an in-progress card ([0027](./0027-board-lead-cards-from-fixtures.md))
fed by the ~3h fixture sweep. It renders a score with no minute and a caption saying
the score is *as of the last check*. That card was correct for its feed and stays
correct for it; what was missing was any feed for which a stronger claim is true.

Verified against production while building this: the route answers `200
{"matches":[],"count":0,"polling":false}` (the normal answer), `400` on any
undeclared query parameter, an empty list rather than a 404 on an unknown league, and
`Cache-Control: public, max-age=10`.

## Decision

### 1 · The in-progress card has two paths, and `isLive` is which one

- **LIVE** — `/cronogol/live`, joined to the fixture by our own id. Prints a real
  **minute** beside the pill, and a note stating the ~30s cadence. LaLiga only.
- **SWEEP** — `/cronogol/fixtures`, unchanged in every particular: no minute,
  `FeedAge`, and a note saying the score is as of the last check.

⚠ **The sweep path is not dead code and must not be removed as a simplification.**
Every league except LaLiga lands there and will keep landing there until the route
widens. Replacing it with something that assumes live data will arrive is how the
Premier League, Serie A, Bundesliga and Segunda lose a card they have today.

### 2 · Selection is two-tier, and tier 1 does not consult the sweep

`boardLive()` in `lib/cronogol/live.ts` prefers a followed club's fixture that
`/cronogol/live` says is in play, and falls back to `liveFixture()`'s sweep flag.

⚠ **Tier 1 deliberately does NOT require `fixture.status === 'live'`.** The live
route sees kick-off within ~30 seconds; the sweep can be three hours behind it.
Gating tier 1 on the sweep would mean the honest feed could only ever confirm what
the stale one already said — the opposite of the point.

Which fixture is *yours* still comes from the fixture route, because that is the only
feed carrying our own slugs on both sides (0027, 0022). What the live route adds is
the state **inside** that match.

### 3 · A ten-minute age cutoff, because of the cache rather than the network

`liveById()` drops any row whose `lastSeenAt` is unparseable or older than
`LIVE_MAX_AGE_MS` (10 min). React Query holds a body for `GC_TIME` — an hour — so a
cold remount can hand the screen an hour-old response before the first fetch
resolves. A minute rendered off that is a frozen number presented as current, which
is the single failure this feature could introduce. Those rows fall through to tier
2, which at least states its age.

### 4 · The stalled state is a first-class rendering, not an error

> ⚠ **REVISED by [0049](./0049-stall-is-lastseenat-not-polling.md), 2026-08-28.**
> The `polling` half of this decision did not survive contact with production —
> the flag read `false` for an entire match that was updating correctly, so the
> card showed a stall that was not happening. `isStalled` now reads `lastSeenAt`
> alone. The rest of this decision — that the stalled state is rendered rather
> than hidden, and that the minute dims rather than disappearing — stands.


`polling: false` beside a non-empty `matches` means the backend has rows it believes
are in play and nothing refreshing them. That is the one failure mode this feature
has, and without the flag it is indistinguishable from a quiet afternoon.
`isStalled()` also trips when `lastSeenAt` falls more than two minutes behind — four
missed server sweeps.

⚠ The minute is **dimmed, not hidden**. A frozen number removed looks like a match
that ended; a frozen number dimmed, beside a note saying updates are paused, is what
actually happened. An unreadable stamp counts as stalled — erring toward "this may be
out of date" is the only direction an honesty signal may err in.

### 5 · A third `STALE` bucket

`live: 15 * 1000`. `feed` (15 min) is thirty stale cycles here and would leave the
card on a minute half an hour behind the match. `stale.ts` forbids a default and
requires a new endpoint to choose a bucket and say why; this is the why.

⚠ **Never below 10s.** The route is `max-age=10` and the data moves every ~30s, so a
faster poll doubles the request count to be handed the identical body.

### 6 · One query key for the whole app, and the poll is gated on focus AND follows

`keys.live()` takes no argument: the route returns every live match in one response,
so a per-fixture key would turn one request into N. The join happens client-side.

`useLive(enabled)` polls at 15s with `refetchIntervalInBackground: false`, and the
Today screen passes `useIsFocused() && hasClubs`. **Both, not either** — a
backgrounded tab must not poll, and neither must a reader with nothing followed,
because the lead cards are suppressed entirely there and there is no row to upgrade.

⚠ `useIsFocused` rather than a `useFocusEffect` + `useState` pair: the latter is a
`setState` inside an effect, a lint error this repo already carries six of.

### 7 · No league parameter is sent

The route takes one, and the app does not use it. Hardcoding `laliga` would silently
cap coverage the day the backend widens the route past it.

### 8 · Deliberate divergences from SPEC §3.1, both carried forward

- **No pulsing dot.** [0034](./0034-next-up-card-live-seconds-countdown.md) refused
  one already, on the live card specifically. The minute is the liveness signal now,
  and it is information rather than animation — a pulse would say nothing the number
  does not, and would need a Reduce Motion path to say it.
- **Still no chevron on the live card** ([0045](./0045-match-events-expanded-row.md)).
  `/cronogol/fixtures/{id}/events` is a finished-only three-hourly sweep, so an
  in-play match still has no events. This is what keeps "a live scoreline beside an
  empty timeline" from ever arising on Today.

### 9 · The word "live" still does not appear in the UI

The pill keeps `In progress` / `En juego` ([0035](./0035-jornada-rows-show-in-play-scores.md)).
What changed is that the card can now back that word with a minute; the vocabulary
did not. The score also stays bare at board size — `liveWash` never grounds a score
([0044](./0044-scores-render-as-split-digits.md)).

### 10 · `scores.ts` is untouched

`statusText()` still returns `null` for a `live` row and `concludedScores()` still
filters those rows out. That suppression is about `/cronogol/scores`, still a
4-hourly opta-keyed snapshot, and nothing here makes it less true. `lastSeenAt` is
**"we looked", not "it changed"**, and must never reach `lastSourceUpdate()`, which
is the *source's* stamp — a different quantity.

### 11 · Two copy strings that became false are corrected, not left

`today.inPlayNote` and `matchdays.inPlayNote` both asserted *"there is no live score
feed yet"*. One exists now. Both now name the real limit instead: live minutes cover
LaLiga only.

## Consequences

- `lib/cronogol/live.ts` is new, pure, and harness-proven — 25 assertions covering
  the age cutoff, both tiers, the `unknown` status, stoppage-inclusive minutes, both
  stall tells, and every unparseable-stamp branch.
- `types.ts` grows a **Live** band. There are now **three** status vocabularies —
  `FixtureStatus`, `ScoreboardStatus`, `LiveStatus` — and the band's job is telling
  them apart. `LiveStatus` has `unknown` (which `FixtureStatus` lacks) and no
  `postponed`/`cancelled` (which both others have), because a live poll never
  observes a schedule change.
- ⚠ `League.live` in `leagues.ts` is an unrelated word meaning "this league is
  shipped". Nothing in the new module reads it.
- `/_debug/gallery` carries seven card states — the six live ones and the sweep
  fallback beside them — because the route is empty most of the day and these would
  otherwise ship unseen.
- **Not yet seen against a real in-play match.** No LaLiga fixture was live while
  this was built, so the `fixtureId` join has been proven against the contract and
  the harness but not against a live row. That is the one open item.

## Alternatives considered

- **A separate "LIVE NOW" section listing every in-play LaLiga match.** Rejected: a
  new surface with its own empty state, competing with `FINISHED TODAY` for the
  screen, for data that is empty most of the day. Upgrading a row already on screen
  is what the `fixtureId` join is *for*.
- **Replacing the sweep card outright.** Rejected — see decision 1. It would trade a
  card four leagues have today for one that only LaLiga can fill.
- **A short `gcTime` instead of the age cutoff.** It would stop the stale-cache paint
  too, but by making the card flash a pending state on every remount, and it would
  not catch a body that stopped refreshing while mounted. The cutoff is in pure logic
  and provable; a cache setting is neither.
- **Driving freshness from `FeedAge`.** It renders whole hours, so on a feed that
  moves every thirty seconds it prints `0` for the entire match.
- **Polling at 5s.** The route's cache is `max-age=10`; it would double the request
  count for identical bodies.
