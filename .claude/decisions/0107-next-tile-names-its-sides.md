# 0107 — The NEXT tile names its sides, and the void closes

- **Date:** 2026-09-03
- **Status:** Accepted — typechecked at both floors; simulator pass pending in the same change
- **Decided by:** Ed Medina — asked for the tile's empty middle to be spent ("a ton of empty space"); the layout that spends it was derived by measurement

## Context

The small NEXT widget's upcoming state was still [0058](./0058-next-widget-centres-and-ticks.md)'s
column: eyebrow row, a bare 38pt `CrestPair`, one flexible `Spacer`, a 20pt
countdown, a footer. On a 158pt tile that spacer is a **~35pt void** — the
column's fixed content measures 101pt against a 132pt content box — and the
footer `kickoffLabel · venue` truncated on live data to `Estadio La Car…`,
which names nothing.

Meanwhile every sibling surface moved past the bare pair. The in-app NEXT UP
card ([0095](./0095-next-up-joins-the-crown.md)/[0096](./0096-next-up-goes-liquid-glass.md))
stacks each **name under its crest** so each side gets half the width — its
header records why a row layout fails (`Real…` v `Real…`). The medium hero
([0086](./0086-week-widget-hero-and-rail.md)) names both sides and marks the
followed one in the accent. The small tile answered *who* with two badges and
spent its surplus on nothing.

## Decision

The upcoming state keeps 0058's centring and its subject, and each side becomes
a **named column** — crest (32pt) over name (10.5pt semibold), the `v` between
them at crest-centre height, the followed side's name in `Tok.accent` (the
medium hero's marking, [0086](./0086-week-widget-hero-and-rail.md)). Below the
pair, the in-app card's own rule idiom at tile scale: a 0.5pt `Tok.hairline`,
then the countdown at **22pt** (up from 20), then the kickoff line. `CrestPair`
had one call site and is deleted. One VoiceOver stop for the whole pairing, as
the app card does.

**The venue leaves the tile.** At this width it only ever rendered truncated;
`kickoffLabel` alone is the footer. The club page one tap away has the full
line.

### Every size is a measured number, not taste

The `ImageRenderer` harness (the [0086](./0086-week-widget-hero-and-rail.md)
method; ⚠ measure BEFORE trimming) produced the constraints. Budgets: the
smallest live canvas is a Display-Zoomed SE's 141pt tile → **115×115pt**
content box inside the 13pt margins; a 158pt tile gives 132×132.

- **Countdown 22pt, and 24 was measured out.** The auto-updating timer's widest
  form `11:59:59` is 93pt at 20pt, **102pt at 22pt, 111pt at 24pt** heavy mono.
  `minimumScaleFactor` is unreliable on auto-updating text (0058), so the size
  must fit the floor with margin: 22pt leaves 13pt, 24pt leaves 4. Both
  branches (timer and precomputed string) take the same size or the 12h swap
  jumps.
- **Names 10.5pt at `minimumScaleFactor(0.8)`.** The worst realistic name
  (`R. Sociedad`, 61pt at full size) lands in a ~52pt SE half-column at scale
  0.85 — above the 0.8 floor, and above the design's 8.5pt smallest-type rule
  (0086).
- **Crests 32pt, spacer minimums 2pt.** The whole column's minimum height is
  **114.5pt against the 115pt floor** — measured, after shaving the name gap
  4→3 and the countdown's top pad 7→6 to get under it. At crest 34 / countdown
  24 the column is 128.5pt and the SE clips. ⚠ Padding added anywhere in this
  column must come out of something else.
- On a 158pt tile the two flexible spacers split ~17pt of slack around the
  pair, so the block still centres in the tile's middle instead of leaving one
  hole above the countdown.

## Consequences

- The live ledger, the empty state and all three accessory families are
  untouched; so are `Provider.swift`, `Cadence`, and the reload budget (trap
  34) — this is paint and layout only. No wire change, no snapshot bump:
  `homeName`/`awayName` have been in the snapshot since v2 ([0059](./0059-your-week-widget-names-both-sides.md)),
  and a v1 snapshot degrades to the abbrs, never a blank.
- ⚠ The eyebrow → pair → hairline → numeral column now rhymes with the live
  ledger's eyebrow → glass panel → footnote, so the idle→live swap at the
  whistle moves less furniture than the old centred layout did.
- ⚠ A derby between two followed clubs marks only the side `clubSlug` resolved
  (home wins the tie, [0029](./0029-widget-owner-resolution.md)/[0102](./0102-widget-club-filter-matches-involvement.md))
  — the same known limit the medium hero already carries.
- ⚠ `footer(row)` and `CrestPair` are gone. Anything wanting `kickoffLabel ·
  venue` back must re-argue the truncation.
- `handoff_AG-ios/SPEC.md` §4 describes an older card still; this entry is the
  record of the divergence, as 0058 was before it.

## Alternatives considered

**A glass slab under the countdown** (the live ledger's panel, for the
idle state too) — the nested-surface language fits the shell, but the slab's
~16pt of padding does not fit the SE floor beside named columns: measured at
122–129pt minimum. The hairline rule buys the same "reported into the tile"
seam for 0.5pt.

**The medium hero's left-aligned stacked rows** (crest · name per row) — on a
square tile a short name (`Betis`, 33pt) leaves the right half of its row
empty, which is the complaint horizontally. The centred columns fill the width
by construction.

**Keeping the venue at smaller type or two lines** — a second footer line does
not fit the SE floor, and a truncated stadium was the ugliest thing on the old
tile. Dropped instead.
