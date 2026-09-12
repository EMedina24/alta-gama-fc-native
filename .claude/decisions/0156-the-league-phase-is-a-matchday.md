# 0156 — The league phase is a MATCHDAY: a second data path through the same chrome

- **Date:** 2026-09-11
- **Status:** Accepted — verified on the simulator against live production data
- **Decided by:** Ed ("can we support adding Champions League to the matchday screen?")
- **Builds on:** [0150](./0150-champions-league-is-a-competition-not-a-league.md) (the `Competition` registry), [0132](./0132-team-windows-feed-the-today-board.md) (convert at the edge), [0137](./0137-ucl-timelines-open-on-last-result.md) (cup timelines)

## Context

The Matchdays screen is built on `GET /cronogol/jornada/{league}/{season}[/{n}]`,
which is league-scoped. `champions-league` is a hard **404** there ("Unknown
league"), and `GET /cronogol/fixtures` carries **no UEFA tie at all** — measured
2026-09-11 over a four-day window: 11 fixtures, five league slugs, zero cup.

The one route that did reach these matches was a club's own fixture list. It
cannot serve a round, and the three reasons were measured across all 18 tracked
Champions League clubs:

| | |
| --- | --- |
| distinct real matches identifiable | **81 of 144** — about ten of eighteen a round |
| opponent name → slug **misses** | **49 of 144**. `opponent` is a bare name string with no slug, and it does not match the standings row's name. Resolving it would mean name matching, which [0022](./0022-finished-today-from-fixtures.md)/[0027](./0027-board-lead-cards-from-fixtures.md) forbid |
| matches arriving under **two** fixture ids | 14 — one row per projecting club (trap 61's shape, on the fixtures route) |
| rows carrying a `round` at all | **72 of 144**, and where present it is the display string `"Jornada 3"`, not a number |

So the screen could not have been built honestly. `senpai-backend` §124 shipped
the three routes the same day.

## Decision

**One screen, two data paths, one row type.**

`GET /cronogol/ucl/jornada/{season}` sizes and names the pager;
`…/{season}/{matchday}` serves the round; `uclFixtureRow` converts each item to
the `JornadaFixtureView` the fixture list already draws. That is 0132's move —
convert at the edge — so no organism below learns which competition it is
drawing, and the day header, the score chip, the in-play caption and the events
disclosure are all inherited rather than rebuilt.

### ⚠⚠ The events route is a different route, keyed on a different id

This is the part that looks like a detail and is not.

| id | domestic `/fixtures/{id}/events` | cup `/ucl/fixtures/{id}/events` |
| --- | --- | --- |
| `UclFixtureView.id` | **404** | 200 |
| `UclFixtureView.fixtureId` (the club-side twin) | 200 | **404** |

Both directions verified 2026-09-11. And the twin is present on only **5 of 18**
matchday-1 fixtures, so a timeline routed through it reaches barely a quarter of
the competition. `useFixtureEvents` therefore takes a `FixtureEventsSource`, the
source is part of the **query key** (the two routes can hold different timelines
for one match), and `FixtureList` carries it as a property of the LIST — every
row in a round comes off one route, so a per-row flag would be three ways to say
one thing and one of them wrong.

⚠ Proven on the simulator with **PSG 6–1 S. Bratislava**, which has no twin at
all: the panel drew Goals 7 / Cards 1 / Subs 10 off the cup route. The domestic
route could never have served it.

### Four domestic assumptions that do not hold, and what replaces each

1. **`totalMatchweeks` → the index's own `matchdays.length`.** `roundCount()` is
   `2 * (clubs - 1)`, a double round robin: **70** for 36 clubs against a real
   8. The league phase is Swiss and the payload deliberately carries no
   `totalMatchdays` so that nobody derives one.
2. **`complete` → `finished === fixtures`.** The cup route refuses the ambiguous
   word, and rightly: on the domestic contract `complete` means COVERAGE, and
   all 38 LaLiga matchweeks report it true in July with nobody having kicked a
   ball. Both counts are served instead, so the question has to be asked out
   loud. The strip's "played" styling asks "has it been played out", NOT "has
   its last kickoff passed" — extra time and a late tie both sit the wrong side
   of a clock comparison.
3. **`kickoffsConfirmed` → `kickoffsTbd === 0`.** The same claim as a count.
   Above zero the index's own `firstKickoffUtc`/`lastKickoffUtc` are
   PROVISIONAL, so the header prints the pending copy rather than a range that
   moves.
4. **`expectedCount` → nothing.** The "n matches missing" line is a coverage
   claim built from two fields the cup does not serve. With nothing to compare,
   there is nothing honest to say, so the line is not drawn.

### The opener is picked by ORDER, not by clock

`currentMatchweek` sorts on `firstKickoffUtc` because domestic matchweek order is
not chronological — LaLiga matchday 1 finished after matchday 2 (trap 2).
`uclOpeningRound` instead walks 1→8 and stops at the first round not played out:
the league phase is a fixed ladder played strictly in sequence, so there is no
deferred opener to defend against, and `firstKickoffUtc` is provisional while
`kickoffsTbd > 0` — here the clock is the **weaker** signal, not the stronger.

⚠ **One effect seeds and clamps the round, not one per competition.** They write
the same state, and two effects racing would let the loser overwrite the winner
on the first render after a tab change.

## Consequences

- ⚠ **No calendar CTA on the cup tab, and that is a MISSING FEED rather than a
  design choice.** "Add all 18 matches" builds
  `feed/jornada/{league}/{season}/{n}.ics`, which is league-scoped — there is no
  Champions League feed. Drawing the button would hand a reader a `webcal://`
  URL that 404s, and a feed URL is a one-way door: already copied onto the
  device, unable to be told it moved. It returns when the backend serves one.
- **The knockout stages are NOT built.** `GET /cronogol/ucl/stage/{season}/{stage}`
  exists, and `stages` is `[]` until the February draw — the normal state of the
  current season for most of the year. A stage is a different shape (two legs a
  tie, no matchday number, no aggregate, and `winnerSlug` is the winner ON THE
  NIGHT — null on all six 2025 ties drawn in normal time, the final included).
  Building UI now would be unverifiable against real data, which is how trap 55
  happens. `UclStageSummary` IS typed, because the index serves it; `UclStageView`
  and a client function are not, because nothing calls them yet.
- ⚠ `stages` must never be re-sorted — it arrives in competition order and
  `stage` is a string, so alphabetical puts `final` first and `playoff` after
  `round-of-16`. Recorded on the type.
- The chip rail on Matchdays goes 4 → 5, which is still under
  `Size.leagueRailTightFrom`, so [0153](./0153-sixth-chip-shrinks-the-crown-mark.md)'s
  tight cut does not apply here and the marks keep their full size. Table's six
  and Matchdays' five now legitimately differ.
- The competition **spells its name** in the eyebrow rather than wearing the
  lockup: [0133](./0133-ucl-lockup-replaces-the-spelled-name.md)'s mark stands on
  cards, not inside an uppercase eyebrow, and the third segment names the PHASE
  where a league names its half.
- ⚠ `hasHalves` is never consulted on the cup — ida/vuelta is a domestic idea and
  the league phase is a single eight-round pass with no return leg.

## Alternatives considered

- **Build the round from followed clubs' fixture lists** — the table at the top.
  Ten of eighteen, 49 unresolvable opponents, 14 double-counted, and no matchday
  number. It would have looked complete.
- **Route match detail through the club page** — works for the 5 of 18 that
  carry a twin. The backend flagged this before it was built.
- **A separate Champions League screen** — a second pager, strip, day grouping
  and fixture list to keep in step with this one, to show the same thing.
- **Reuse the domestic `JornadaView` type with sentinels** — `complete: true` on
  a cup round is the exact lie the backend refused to serve.
