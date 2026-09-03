# 0109 — The rail becomes a card when it holds one match

- **Date:** 2026-09-03
- **Status:** Accepted — typechecked; simulator pass in the same change
- **Decided by:** Ed Medina — flagged the single-match rail off a live
  screenshot ("can we update the format if there is only a single match")

## Context

The medium tile's rail is a full-height glass column built for up to two rows
([0086](./0086-week-widget-hero-and-rail.md)). With exactly ONE fixture behind
the hero — which is the tile's everyday state for a reader following two clubs
— that one row centres in the tall column and wears the multi-row compromise
for no reason: names truncated to `Valen…`/`Barce…` beside a wide 12-hour
time, floating in ~90pt of empty glass. 0086 accepted truncation as the cost
of fitting a row; a column with one occupant is not paying that cost for
anything.

## Decision

`rail.count == 1` draws **`railSolo`** — a card that SPENDS the column rather
than centring a small block in it (the first cut centred ~76pt in ~118 and Ed
called the remainder immediately: "a ton of wasted space"). Two anchored
blocks: the clubs **named in full** at the top — 20pt crests, 10.5pt names,
followed side in the accent — and the kickoff block at the bottom — `Dom 6`
(the rail's 0108 voice, shared with the rows via the new `railDay` builder)
over the time at 18pt medium numerals — with the flexible gap between them.
Two rows keep 0086's multi-row layout untouched.

- **Clubs first, kickoff below — the small NEXT tile's order (0107), not the
  hero's.** The hero beside this card already leads with the kickoff; two
  tellings of "when" level with each other would race.
- **Subordinate to the hero on purpose:** 18pt medium time against the hero's
  27pt ultralight, 20pt crests against its 24.
- **`roomy` reuses the hero's 118pt height branch (0108), same threshold, one
  constant:** the full card is ~102pt minimum, over a zoomed SE's ~95pt
  column, so compact tiles take a smaller cut (16pt crests, 9.5pt names, 15pt
  time, ~90pt).
- **Nothing truncates, on any device:** the worst name (`R. Sociedad`, 61pt
  at 10.5pt) has ~98pt on a standard tile and 67pt on an SE, where the 0.85
  scale factor covers the 4pt gap — engaged nowhere else.
- A `Link`, like every rail row — `widgetURL` carries one destination and the
  tile has up to three.

## Consequences

- The two-club reader (the current real state: hero + one rail fixture) gets
  full names where they got `Valen…`. The three-club reader sees no change.
- ⚠ The solo card says `Dom 6`, not `Domingo` — the rail keeps its dated
  short voice (0108) rather than borrowing the hero's spoken one; two spelled
  days on one tile would fight over which is "the" next match.
- No wire change — the card is drawn entirely from fields v5 already carries;
  v4 degrades via `railDay`'s uppercase fallback and the abbr fallbacks.
- ⚠ An EMPTY rail is still no rail at all — the hero at full width (0086's
  rule); this entry changes only the one-row case.

## Alternatives considered

**Let the one row keep more width** (drop the day column, widen names) —
still a squeezed row in a tall empty column; fixes the truncation, not the
void. **The spoken day (`Domingo`) on the card** — competes with the hero's
`Viernes` for the tile's one spelled day; rejected above. **Hide the rail and
draw the hero full-width with a second fixture line** — reshapes the whole
tile for a state 0086 already solved structurally; the column IS the right
container, it just needed the right occupant.
