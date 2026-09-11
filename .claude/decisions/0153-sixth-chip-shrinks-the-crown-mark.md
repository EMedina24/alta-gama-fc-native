# 0153 — A sixth chip shrinks the crown MARK, and a drawn lockup joins the rail

- **Date:** 2026-09-11
- **Status:** Accepted — ⚠ the lockup height is a FIRST CUT and device-judged, like 0116 before it
- **Decided by:** Ed (chose the sixth chip over a separate control, and placed it second)
- **Amends:** [0118](./0118-league-rail-static-and-plate-drags.md) — which pre-authorised exactly this ("a sixth league shrinks the slots further; the mark tokens are the lever if that day comes")
- **Reads:** [0123](./0123-league-marks-full-colour-at-rest.md) · keeps [0031](./0031-league-filter-tiles-are-artwork-only.md) · third surface for [0133](./0133-ucl-lockup-replaces-the-spelled-name.md)

## Context

The Champions League tab makes the Table rail **six** chips. The rail never
scrolls (0118) and every slot is an equal flex share, so slot width is a
function of slot count.

⚠ **0118's own figure is wrong, in the direction that makes this harder.** It
says five slots share "~61pt each". The measured chain is
`min(width, MaxContentWidth 520) − 2×Spacing.five(20) − 2×Size.leagueRailPad(6)`,
split with no gap:

| Device | pt | Slot band | 5 slots | 6 slots | Air/side at 6 vs a 54pt mark |
| --- | --- | --- | --- | --- | --- |
| SE 3 / 13 mini | 375 | 323 | **64.6** | **53.83** | **−0.08 — wider than its slot** |
| 15 / 16 | 393 | 341 | 68.2 | 56.83 | 1.4 |
| 16 Pro | 402 | 350 | 70.0 | 58.33 | 2.2 |
| 16 Pro Max | 440 | 388 | 77.6 | 64.67 | 5.3 |

Nothing clips — the chip has no `overflow: hidden` — so the failure is not a
crash. It is six lockups edge to edge with no gutter and a pill plate reduced to
a 53.8×52 rounded square with artwork on both rims.

The Champions League also has **no wire artwork**: `GET /cronogol/leagues` serves
no row for it, so the chip would otherwise fall to the text branch.

## Decision

**Three things, and the chip HEIGHT is not one of them.**

1. **A tight mark cut at `Size.leagueRailTightFrom` (6) slots or more:**
   `leagueChipMarkWCrownTight: 44` / `...HCrownTight: 22`. Derived, not guessed
   — today's real budget at five chips is 5.3pt/side at 375, and
   `53.83 − 2×5.3 = 43.2`. The result leaves 4.9pt/side, within a tenth of a
   point of what five chips have now. ⚠ The values equal the 0089 GROUND cut and
   are held under separate names on purpose (the `moved`/`bandUel` precedent):
   aliasing would make a crown resize silently resize the Clubs body row.
   `leagueChipHCrown: 52` is untouched, so 0116's device-judged calibration and
   the whole crown band stand.
2. **`LeagueOption.mark?: CompetitionMarkKind`**, drawn at
   `leagueChipLockupHCrown: 34` — sized by the chip, not by the landscape mark
   box, because the lockup is roughly square (1.04:1) with a wordmark inside it
   and at 22pt height its words become the smudge `Size.competitionMark`'s own
   comment warns about. Precedence is `mark → logoUrl → text`; 0031 holds,
   because the lockup *is* artwork.
3. **One `ChipArtwork`, used by the chip AND by the lens's magnifier.**

## ⚠⚠ The two bugs this change introduces if (3) is skipped

Both are invisible to `tsc` and visible only with a finger held on the rail.

- **The lens drew a HOLE.** `SelectionPlate`'s magnifier branched on `logoUrl`
  independently of the chip, so a slot it could not draw simply vanished under
  the magnifier. That is `BAND_COLOR`'s lesson at a different scale: two copies
  of one decision will disagree.
- **The magnifier's counter-translation assumed ONE shared mark height.** It
  subtracted `(markH × MAG) / 2` on the parent, which centres every copy only
  while they are all `markH` tall. A 34pt lockup beside 22pt landscape marks
  mis-centres one or the other. The parent now translates to the viewport centre
  alone and each copy carries its own `top: −(h × MAG) / 2`.

`Slot` now *is* a `LeagueOption` (it gained `name`), so the two cannot diverge by
construction rather than by agreement.

## Consequences

- ⚠ **VoiceOver would have said it twice.** The chip `Pressable` is a `tab`
  carrying `accessibilityLabel={name}` and `CompetitionMark` hardcodes its own
  label. The atom gains `decorative?: boolean`; the default stays `false`,
  because on a card the mark is the only place the words exist — which is why
  0133 gave it a label at all.
- **The drawn mark inks `text` (white), not `accent`.** 0123's "full colour at
  rest" means *not desaturated*; a drawn mark has no colour of its own, and
  white is the lockup's own ink on a dark ground — 0133 chose it twice already.
  Recorded here so nobody "restores" it to lime.
- `styles.mark` / `styles.markCrown` are deleted: there are three cuts plus a
  self-sizing lockup, a `StyleSheet` entry cannot take a runtime branch, and the
  magnifier needs the same numbers to position by.
- Matchdays (4 chips) and Clubs (5, ground tone) are untouched — the tight cut
  applies at ≥6 and only the Table rail has six.
- ⚠ **34 is a first cut.** 0116's own simulator-approved 44 still read small on
  the phone. If the lockup reads dominant beside the landscape marks, the answer
  is to extract the STARBALL alone as a second `CompetitionMarkKind` and draw it
  at 22 — a real job, and 0133 records the SVG path-grammar trap waiting in it
  (`.378.756` is two numbers).

## Alternatives considered

- **Let the rail scroll past five** — reverses 0118 outright, and the plate's
  drag-to-snap is built on every slot being measured and on screen.
- **A separate `SegmentedControl` (Ligas | Champions) above the chips** — Ed's
  call, and he took the sixth chip. Two stacked controls in one crown.
- **Shrink the chip height instead of the mark** — reverses 0116, which was
  device-judged twice and is about touch target as much as looks.
- **Bundle a PNG for the chip** — 0133's "drawn, not loaded" rule, and the
  master's navy fill is invisible on this app's grounds anyway.
