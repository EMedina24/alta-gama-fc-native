# 0158 — Matchday rows become a stacked crest-and-name pair, and the score moves to a goal column

- **Date:** 2026-09-11
- **Status:** Accepted — verified on the simulator, EN, LaLiga + Bundesliga + UCL, 24h and 12h, and at a 375pt-device clamp
- **Decided by:** Ed Medina

## Context

Ed, off a screenshot of the Matchdays row: *"the match rows seem cramped. The
club names stacking seems messy and difficult to read."*

The row 0035 built was `[time 64/88] · [⬤ v ⬤ 95pt] · [home / away / venue]`.
Its defect is **correspondence**: the two crests run HORIZONTALLY while the two
names run VERTICALLY, so nothing connects a crest to its club. The reader pairs
them by remembering that the left crest goes with the top name. 0035 had a
reason — *"this pairing is unnamed, so the crest is the whole identification"* —
but the names sit right beside it, so the pairing was never unnamed in practice.

The cost was compounding: the 40pt pair took ~95pt, leaving the names ~187pt on
a 402pt screen with `Spacing.half` (2pt) of leading between them. That is the
cramping, and it is why 0035 had to claw the row gap back to `Spacing.two` and
nominate the venue as the designated shrink.

The app had already solved this one screen over. FINISHED TODAY (0069) puts one
crest beside its own name, twice — for exactly the same reason, arrived at from
the opposite direction (0069 was fixing truncation, not correspondence).

## Decision

1. **Each match is a stacked pair.** Home over away, one `Size.crestRow` (26)
   crest and one name per line, `Spacing.two` between them, venue under. The
   same shape as 0069, so a reader moving between the board and the matchday
   list reads one row type, not two.
2. **The crest drops 40 → 26** and its cut `small` → `xsmall`. This is 0043's
   argument, not a new one: `UpcomingCard` dropped 40 → 30 *"because the name
   now carries the identification and the crest only confirms it"*. At 26pt a
   @3x box is 78px, which is what `CREST_KEYS.xsmall` is documented for and what
   0069 already ships.
3. **The name rises to `Type.headline` (17), from `bodyStrong` (15).** Dropping
   the pairing column hands the name ~60pt back and there is no goal column on
   the right taking it away again. Measured:

   | device / clock | before | after | after, with goal column |
   | --- | --- | --- | --- |
   | 375pt · 12-hour | — | 197pt | 162pt |
   | 402pt · 12-hour | ~163pt | 224pt | 189pt |
   | 402pt · 24-hour | ~187pt | 248pt | 213pt |

4. **A club name may take TWO lines.** It never truncates. This reverses 0035's
   one-line rule, and it is the reference implementation's own conclusion for
   the same names: *"a club name that wraps beats one that silently loses its
   second half."* Truncating one is the failure 0029 exists to name; wrapping
   one is not. Rows in a day group are therefore ragged — accepted here, and
   **not** on FINISHED TODAY, whose goal digits are read down the card.
   ⚠ The venue stays the designated shrink at one line; 0035's rule stands.
5. **The score moves to a per-line goal column on the right** (Ed: *"can we
   update the score view to match this one… it's the same as on the board
   screen"*). `Type.numeral`, `tabular`, `Size.goalColumn` (22), right-aligned
   behind a `hairlineMid` rule — 0069's `goals` style, ported rather than
   re-derived, because the two must stay in step. Each digit now sits on its own
   club's line and dims with its own name, which the chip could not do.
6. **The column is reserved for the whole ROUND, not per row.** `anyResult` is
   computed once over `fixtures`, keyed on STATUS rather than on non-null goals
   so a `live` row with no score yet still gets one. Goals are read down the
   list, and a column
   appearing only on played rows would shift the names on every row around it —
   0069's *"must not shift by group"* rule, applied at the scope that exists
   here. A round with nothing played draws no column at all, so a future
   matchday pays nothing for it. An unplayed row inside a reserved column prints
   `–`, never `0` (0044).
7. **The chip leaves the timing cell.** `FixtureTiming` gains `showScore`
   (default `true`); the matchday row passes `false`, so the cell draws a time
   rather than a score. ⚠ **(8) then takes the time back on concluded rows** —
   read the two together; this item on its own reads as a gain that (8) reverses
   on purpose.
   ⚠ This does **not** relax 0035 or trap 8. An in-play score still appears only
   beside a caption that says *in play* and a cadence sentence on the screen;
   `showScore` moves where the digits are drawn, never whether the caption and
   the footnote are required.
8. **A concluded row says `FINAL`, in `accent`, where its kickoff would be**
   (Ed: *"for concluded games can we remove the time and replace it with FINAL
   in our lime color"*). `FixtureTiming` gains `finalLabel` and one branch,
   opt-in: without it nothing changes for any caller. It is a WORD, so it is
   `eyebrowLg` and not `tabular` — the one value that cell draws that is not a
   time or a dash. ⚠ Copy must stay SHORT: it renders uppercase inside
   `Size.timingColumn` (64pt at a 24-hour clock), which is why the Spanish is
   `Final` and not `Finalizado`.
   ⚠ **It costs a played row the time it kicked off** — the gain (7) had just
   won. That is the trade Ed asked for, stated so it is not re-litigated by
   someone reading (7) alone.
   ⚠ **`FINAL` is a THIRD lime thing on this screen**, beside the current-round
   pill and the calendar chip, and SPEC §2 says *"if two things on a screen are
   lime, one is wrong"*. Flagged before building and judged on a fully-played
   round, where ten of them appear at once. Ed's call, and the same call he made
   in [0157](./0157-the-calendar-cta-becomes-a-pill.md).
9. **`FT` is deleted, and the chevron stays under the score.** Ed had asked for
   `FT` under the digits (*"please move the ft to sit under the scores"*) and
   that is where the disclosure still lives — but with `FINAL` on the same row
   the word said the fact twice, which is exactly what 0069 deleted it for on
   the board. `FixtureListProps.finishedLabel` and `copy.matchdays.finished` go
   with it; `copy.today.finished` is untouched. ⚠ The goal column drops back to
   `Size.goalColumn` — the short-lived `goalCaptionColumn` existed only to hold
   `FIN ⌄` and is deleted rather than left dead.
   ⚠ It does **not** take a column of its own the way the board's chevron does —
   that is trap 33, where a right-hand chevron column cost this row's names 19pt
   and truncated `Espanyol de Barcelona`.
10. **The IN-PLAY caption stays in the kickoff cell**, and is untouched by any
    of this.
    `In play` says *as of the last check*, a claim about the TIME, and it is the
    one the cadence sentence pairs with (0035). It is also the only column that
    can afford it: 0035 sized `Size.timingColumn` (64/88) *against `EN JUEGO`,
    not against the clock*, so the space is already reserved there at zero cost.
    Under the score it would widen the goal column on in-play rows alone and
    shift the names on every row around them — the very thing (6) prevents.
11. **The row is a COLUMN; the venue is a sibling of the head.** Inside the name
   block, the head's vertical centre fell between the away club and the venue,
   and `13:00` read as belonging to the away side rather than to the match. The
   venue's indent is built from the tokens to its left — the timing column is
   the clock-dependent one — so its left edge lines up with the club names.
12. **`ClubLine` is promoted to `molecules/`** under 0013, `fixture-list` being
    the second organism to want it. Flat scalars only (0043): the organism
    resolves `crestSrc`, `abbreviate` and `displayName` before it renders one.
    ⚠ The two consumers legitimately differ — the board keeps `bodyStrong` and
    `lines={1}` because its goal column takes ~35pt off the right and its digits
    are a table; the matchday row takes `headline` and `lines={2}`.
13. Rows grow ~80pt → ~118pt, and a wrapped row further. Ed: *"if the rows need
    to be taller to fit everything thats fine."* ~5 matches a screen, was ~8.

`CrestPair` is deleted. It was private to the organism, so nothing else moved.

## Supersedes

**0035's row geometry only** — the horizontal crest pairing, `Size.crestCard`
at 40, the `small` cut, the `Spacing.two` row gap, and the one-line name rule.

⚠ **The rest of 0035 stands and is not superseded**: the in-play branch, the
`In play` / `En juego` caption that must never say "live", the required cadence
footnote beside the list, `Type.numeralLg`, and the full-bleed row separators.

## Verified

`npx tsc --noEmit` clean · `npx expo lint` at the 5-error/1-warning baseline ·
`npx expo export --platform ios` · no JS errors in the simulator log.

On the simulator: LaLiga round 5 mixing finished and scheduled rows; a round
with nothing played (no column drawn); matchday 32 with `kickoffTbd` (`--:--`
centred, provisional-dates footnote intact); Bundesliga, whose `venue` is null
on every fixture, so the third line is absent and the row simply sits tighter;
the UCL round (0156), identical as required.

⚠ The width gate was run at a **335pt clamp — a 375pt device's content width**,
on a 12-hour clock, with the goal column present, there being no SE installed
(0155's trick). `Bayer 04 Leverkusen` and `Borussia Mönchengladbach` **wrap;
neither truncates**. `Espanyol de Barcelona` still fits on one line.

⚠ The goal column was checked in **Spanish** as well as English — `FIN ⌄` is
the string that sets `Size.goalCaptionColumn`, and it fits with the column
holding its width against the `–` rows beside it. ⚠ Forcing the locale
fast-refreshes `store/preferences.ts` and **wipes the persisted store** (trap
63); `/_debug/skip-onboarding` is the way back.

FINISHED TODAY re-checked at `/_debug/gallery?only=finished` after the
`ClubLine` swap — `Wolverhampton Wanderers`, `Borussia Mönchengladbach`, the
draw, the null side's `?` tile and the double-digit `10` all unchanged.

## Not done

- **A live row was not reachable**, so two things are unconfirmed by eye: the
  `rowActive` tint's full bleed (`styles.row` keeps its
  `marginHorizontal: -Spacing.five`), and the in-play caption in the kickoff
  cell now that `FT` has left it.
- **The chevron was left where it is**, so the row does not match the board's
  trailing-chevron column. Trap 33 is the reason, and it is worth more than the
  resemblance.
- **Dynamic Type** at large sizes remains untested against the 17pt name, as it
  was against 0035's 19pt numeral.
