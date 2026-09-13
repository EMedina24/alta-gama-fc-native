# 0160 — A seventh chip shrinks the mark again, and the cut stops being a boolean

- **Date:** 2026-09-12
- **Status:** **Superseded by [0162](./0162-the-league-rail-becomes-a-dropdown.md)** (2026-09-13) — which is the "second control" this entry's own last line said the eighth chip would need. The 38×19 cut never shipped to a phone. Keep the arithmetic here in case a rail is ever wanted back
- **Decided by:** Ed (chose the tighter cut over a scrolling rail)
- **Amends:** [0153](./0153-sixth-chip-shrinks-the-crown-mark.md) — same lever, one slot further on
- **Keeps:** [0118](./0118-league-rail-static-and-plate-drags.md) (the rail still never scrolls) · [0116](./0116-crown-league-chips-larger-cut.md) (chip HEIGHT untouched) · [0031](./0031-league-filter-tiles-are-artwork-only.md) · [0123](./0123-league-marks-full-colour-at-rest.md)
- **Caused by:** [0159](./0159-liga-hondubet-joins-the-catalogue.md)

## Context

Liga Hondubet makes the Table rail **seven** chips — six leagues plus the Champions
League. The rail never scrolls and every slot is an equal flex share, so slot width is
purely a function of slot count. 0153 pulled this lever for the sixth and pre-authorised
nothing beyond it.

The measured chain, unchanged from 0153's:
`min(width, MaxContentWidth 520) − 2×Spacing.five(20) − 2×Size.leagueRailPad(6)`

| Device | content pt | 6 slots | **7 slots** | air/side at the 44 tight cut |
| --- | --- | --- | --- | --- |
| SE 3 / 13 mini | 323 | 53.83 | **46.14** | **1.07** |
| 15 / 16 | 341 | 56.83 | 48.71 | 2.36 |
| 16 Pro | 350 | 58.33 | 50.00 | 3.00 |
| 16 Pro Max | 388 | 64.67 | 55.43 | 5.71 |

Nothing clips — the chip has no `overflow: hidden`, exactly as at six — so this is not a
crash. It is seven marks with a hair of gutter between them on the smallest phone.

## Decision

**Three things, and again the chip HEIGHT is not one of them.**

1. **A tighter cut at `Size.leagueRailTighterFrom` (7) slots or more:**
   `leagueChipMarkWCrownTighter: 38` / `...HCrownTighter: 19`. Derived the way 0153
   derived 44, not guessed: six chips have 4.9pt/side today, and `46.14 − 2×4.07 = 38`
   restores 4.07 — within a point of what the sixth slot reads like. The 2:1 ratio matches
   both cuts above it, so a mark changes scale as the rail grows and never shape.
2. **The cut becomes a three-valued `MarkCut` (`'full' | 'tight' | 'tighter'`), not a
   second boolean.** `tight && tighter` is not a state, and two flags are two places for
   the chip and the lens to disagree — which is the entire subject of 0153's consequences
   section. It is computed **once** in `LeagueSwitch` from `leagues.length` and threaded
   to `markBox`, `magnifiedBox` and `Chip` unchanged.
   ⚠ The thresholds are tested **widest-first**: the `tighter` test must run before the
   `tight` one, or seven slots answer `'tight'` and the seventh mark overhangs.
3. **`leagueChipHCrown: 52` is untouched**, so 0116's twice-device-judged touch target and
   the whole crown band stand. The UCL lockup at `leagueChipLockupHCrown: 34` is ~35.3pt
   wide and still clears a 46.14pt slot with 5.4pt a side, so it needs no third value.

## Consequences

- 0153's structural fix is what made this a small change. Because `ChipArtwork` is already
  the **one** artwork decision and `Slot` already **is** a `LeagueOption`, the lens
  inherited the new cut for free — the two bugs 0153 documents (the magnifier drawing a
  hole, and its counter-translation assuming one shared mark height) could not recur here,
  because there is still exactly one place that answers the question.
- ⚠⚠ **Matchdays and Clubs both reach SIX now** — Matchdays takes `ROUND_LEAGUES` (five,
  Honduras included) plus the cup; Clubs takes the whole catalogue. Both therefore cross
  `leagueRailTightFrom` **for the first time**. The existing ≥6 cut covers them and needed
  no code, but neither rail has ever drawn it, so both want a look on the SE. 0153's note
  that "only the Table rail has six" is now false and is superseded by this line.
- The ground tone is untouched, as in 0153. It carries no competition chip, so it tops out
  at the catalogue's own length and reaches a threshold only after the crown already has.
- ⚠ **38 is a first cut.** Every chip number in this app has been wrong once on a phone
  and right on the simulator — 0116's approved 44 read small, and 0153's 34 lockup is
  still labelled provisional. If the marks read as stamps rather than badges, the next
  lever is the rail's own `leagueRailPad` and `MaxContentWidth`, **not** a fourth cut:
  three sizes for one element is already the ceiling.
- An eighth chip has no lever left and should not get one. At eight, 375pt gives 40.4pt a
  slot and the honest answers are a scrolling rail (reversing 0118) or a second control.

## Alternatives considered

- **Let the rail scroll past six.** Reverses 0118 outright, and the plate's drag-to-snap is
  built on every slot being measured and on screen — a rework of `SelectionPlate`, not a
  flag. Ed declined it here as he did at six.
- **Split leagues from competitions** — move the UCL chip to its own control above the
  rail, keeping six league chips. The alternative 0153 already rejected: two stacked
  controls in one crown.
- **Shrink the chip height instead of the mark.** Reverses 0116, which was device-judged
  twice and is about the touch target as much as the look. Rejected at six, rejected again.
- **Reuse `leagueChipMarkWCrownTight` and just lower the threshold.** Would put seven marks
  at 1.07pt of gutter, which is the condition this exists to fix.
