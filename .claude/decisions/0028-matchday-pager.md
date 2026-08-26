# 0028 — Matchdays pager: one clamped setter, text chevrons, no range while provisional

- **Date:** 2026-08-25
- **Status:** Accepted
- **Decided by:** Ed Medina

## Context
SPEC §3.2 puts a prev/next pair and a right-aligned date range + count under the
Matchdays title. The strip already existed; the handoff flagged two traps: the
arrows must not hold a second copy of the matchweek state, and a date range must
be gated on `kickoffsConfirmed` because provisional dates move.

## Decision
- `MatchdayPager` is a dumb molecule. The screen owns one `goTo(n)` clamped to
  `[1, totalMatchweeks]`; the strip and both squares call it. Prev/next are
  disabled at the ends rather than wrapping.
- The range and count come from the season index's `JornadaSummaryView`, not the
  round's detail query — available before the round loads, so the header never
  skeletons. `formatDateRange` collapses shared parts to the right and handles
  cross-month and cross-year spans (jornada 1 ran 15–27 Aug).
- While `kickoffsConfirmed` is false the range slot prints a short "Dates to be
  confirmed" in `textFaint`, and the zone abbreviation is dropped with it. Calm
  text — that state is most of the season.
- The zone abbreviation is read **at the round's first kickoff**, so a December
  round says CET while an August one says CEST.
- Chevrons are the text glyphs `‹` `›`. No icon set is used anywhere in `src/`;
  `expo-symbols` is installed but adopting it is a separate decision.
- The 34pt pill size is now `Size.pill`, shared by the strip and the pager.

## Consequences
- No haptic on the arrows — `expo-haptics` is not installed (backlog item 8).
- Switching to `SymbolView` chevrons later is a one-file change in the molecule.
- The strip's accessibility label is now localised (`copy.matchdays.title`),
  fixing a hardcoded English string found on the way.

## Alternatives considered
- **Squares flanking the title** — the screenshot puts them on their own row.
- **A new `ScreenScaffold` slot** — `sticky` is already an inline column under
  the header; the pager is simply its first child.
- **Printing the provisional range anyway, styled faint** — a date that will move
  is worse than none; the calendar sheet already explains provisional times.
