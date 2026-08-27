# 0044 — Scores render as split digits with a rule, chipped in a list

- **Date:** 2026-08-26
- **Status:** Accepted — verified on the simulator
- **Decided by:** Ed, with Claude

## Context

Every score in the app was one string, `` `${home}–${away}` ``, an en dash with
no spaces. It was hand-rolled in **four** independent places — `ScoreLine`,
`FixtureTiming`, `FinishedToday`, `SeasonSpine` — with no shared helper, so the
format was a convention held up by four copies agreeing with each other.

The design moved away from it. Two problems with the single string:

1. **It is one word, not two facts.** `0–2` and `2–0` have the same silhouette.
   The reader has to parse left-to-right to learn who won.
2. **The number carried no emphasis.** The losing side's *name* already dropped
   to `textDim` (`scoreEmphasis`), but the digits stayed at full ink, so the
   loudest element in the row was the one part of it that said nothing about the
   result.

## Decision

A score is a `Score` **atom**: two numerals with a thin vertical rule between
them. One place now knows what a score looks like; the four copies are gone.

- **Emphasis extends to the digits.** The losing digit drops to `textDim` with
  the losing name; a draw leaves both full. This is `scoreEmphasis` from
  `scores.ts` — imported, not re-implemented. `FinishedToday` and `FixtureList`
  each carried a private fourth and fifth copy of that three-line function; both
  are deleted.
- **A null score mirrors the format** — `– │ –`, never a zero, never a bare
  single dash. A row is the same width before and after a score arrives.
- **The chip is for list rows only.** `FinishedToday`, the jornada column and
  `SeasonSpine` sit in a `raised` chip on `Radius.chip`. The Today hero stays
  **bare** at 38pt: it is already the largest thing on the screen and a chip that
  size is an object, not an emphasis.
- **The chip ground is neutral (`raised`), never `liveWash`.** A container that
  reads as "current" is the claim HANDOFF trap #8 exists to stop. Trap #8 is
  otherwise untouched: no minute, no dot, and the in-play shape from
  [0035](./0035-jornada-rows-show-in-play-scores.md) — score, honest caption,
  cadence sentence — still holds in full.
- **The two digits are one accessibility element.** Split into two `Text`s they
  are two VoiceOver stops that say "one" and then "zero" a swipe apart.

## Consequences

The chip is wider than the string it replaced, and the two things it sits
between are club names. Both costs were measured on the simulator, not guessed:

- **Chip padding is `Spacing.two`, not `three`.** At `three` the FINISHED TODAY
  row truncated `Real Madrid` v `Real Sociedad` — the failure
  [0029](./0029-upcoming-rows-read-from-the-followed-club.md) names.
- **`FinishedToday`'s row gap drops `two → one`.** 4pt back at each of five gaps
  is what makes `Real Madrid` fit. Same lever 0035 pulled on the jornada row, for
  the same reason. `Real Sociedad` still truncates; it is two characters longer
  than the column can hold at any padding that keeps the chip.
- **The jornada chip does not stretch.** `FixtureTiming`'s cell is a column, so
  the chip stretched to the cell's width by default — and that width is a caption
  artifact that changes with the clock format, so the chip would have been 64pt
  wide for a 24-hour reader and 88pt for a 12-hour one. It is pinned to
  `alignSelf: flex-start` (or `flex-end` when `align="right"`) and hugs its
  digits, aligning with the caption under it.
- **Measured: the chip is 57.0pt.** Decoded from a simulator screenshot at @3x,
  identical on every row. That is inside `Size.timingColumn` (64) with 7pt spare,
  so `EN JUEGO` (~59pt) is still what sets the 24-hour column — 0035's
  measurement survives and the crest pair does not move on a scored row.
  ⚠ A **two-digit** score is ~68pt and would push that column by ~4pt on a
  24-hour clock. A 10-goal match is rare enough to accept the nudge; do not fix
  it by raising `timingColumn`, which 0035 forbids for the name column's sake.

New tokens in `theme.ts`: `Size.scoreRule{Board,RowLg,Row}` for the rule's height
per size and `Size.scoreRuleWidth{,Board}` for its thickness. `Type` gains
nothing — the sizes map onto `scoreLarge` / `numeralLg` / `numeral`, and
`numeral` stays pinned at 16.

⚠ The rule is **not** `StyleSheet.hairlineWidth`. At 0.33pt beside a 38pt numeral
it disappears and the score reads as two unrelated numbers.

⚠ `SeasonSpine` passes `goalsFor`/`goalsAgainst`, the requested club's
perspective. Swapping them for `goalsHome`/`goalsAway` now inverts the *emphasis*
as well as the score — the atom dims whichever digit is lower.

## Alternatives considered

- **Keep the en dash, dim only the names.** The cheapest option and the one the
  code already had. Rejected: it leaves the biggest element in the row saying
  nothing about the result.
- **Chip everywhere, hero included.** Rejected: a 38pt chip is the loudest object
  on the Today screen and the hero is not something a reader has to find.
- **Bare split digits in the jornada column, no chip.** Held in reserve in case
  the chip did not fit the 64pt column. It measured 57pt, so it fits, and the
  chip is consistent with the other two list surfaces.
- **A single faint dash for an unplayed match.** Rejected: the row then changes
  width the moment a score lands, which is visible in a list that refreshes.
- **Raise `Size.timingColumn` to buy the chip room.** Rejected outright by 0035 —
  every point that column takes is `Espanyol de Barcelona` fitting or truncating.
