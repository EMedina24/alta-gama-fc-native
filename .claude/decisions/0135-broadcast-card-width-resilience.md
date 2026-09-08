# 0135 — The broadcast card is measured at every width, and never truncates a count

- **Date:** 2026-09-08
- **Status:** Accepted — harness green across the 290–420pt sweep, `swiftc -typecheck` clean at the 17.0 floor; a Display-Zoomed real-device render is the outstanding check
- **Decided by:** Ed Medina, off a user's lock-screen screenshot (team code truncated to `R…`, score digits clipped mid-glyph) — kerning, floors, and the compact-tier rule confirmed by Ed 2026-09-08
- **Amends:** [0085](./0085-broadcast-card-redesign.md) — extends its one-width
  measurement to a width matrix; every 0085 vertical value stands. Its 46pt
  crest and 34pt score become the REGULAR tier's values rather than the only
  ones.

## Context

A user reported the lock-screen Live Activity card distorted: the home
abbreviation truncated to `R…` and the score digits clipped in half. The user's
phone runs Display Zoom. 0085 measured the card once, at 369pt — a standard
mid-size phone — and that measurement was scratch work (HANDOFF records the
method as `swiftc` + macOS font metrics; nothing was committed). Display Zoom
narrows the card to 351pt on a mainstream phone and 296pt on the mini/SE class,
and none of the fixture row's 132pt of fixed cost (two 46pt crests, four 10pt
gaps) narrows with it — the whole loss lands on the two flexible abbreviation
columns beside a score cluster that had **no guards at all**.

The committed harness reproduced the report before any fix: at 351pt with a
two-digit score each side column granted 35pt against a 69pt `MUN`, below the
old 0.8 floor's reach — and the unguarded `ScoreDigit` was what actually gave
first, clipping exactly as screenshotted. With worst-case content the shipped
geometry only fit at **392pt and up**. The live card also measured **180.5pt**
against Apple's ~160 cap at narrow widths — `VISITA` and the score wrapping —
which eats the clock bar.

## Decision

1. **`scripts/activity-harness.swift` is the standing gate for
   `MatchActivity.swift`.** It compiles the REAL widget files (no copy), renders
   the card through `ImageRenderer` under `simctl spawn`, and fails on: height
   over 160pt at any width 290–420 (1pt steps, three content states); the
   never-truncate valve (fixed chrome + score cluster + floored abbreviation
   and meta columns must fit, worst content, every width); readability
   (typical content holds ≥0.75 abbreviation scale at every real device width
   ≥330, ≥0.55 on the zoomed-mini class). It emits PNGs at the nine real card
   widths for the eyeball pass. Run it before shipping any change to the card
   — the build/run command is in its header. The card's pieces went `private`
   → `internal` for exactly this (identical meaning inside the extension
   binary).
2. **The width matrix**: card = device logical width − 24pt of system inset
   (anchored on 0085's 369-on-393 point). Nine real widths across standard and
   Display Zoom: **296 · 351 · 366 · 369 · 378 · 390 · 404 · 406 · 416**. The
   assertion sweep runs 290–420 so an inset mis-extrapolation cannot hide a
   failing width. ⚠ The inset is extrapolated from one measured point — the
   Display-Zoom device render is what retires that risk.
3. **A compact tier, chosen by measured width.** `Geometry.Metrics` regular
   (crest 46 / gap 10 / abbr 30 / score 34 — 0085's values) and compact
   (36 / 8 / 26 / 30), selected below `Geometry.compactBelow` (320 content-pt ≈
   a 352pt card): every Display-Zoomed phone drops to compact, every standard
   one stays regular. At the boundary the tiers render typical content at
   near-identical effective sizes (26pt vs 30×0.88), so there is no cliff. The
   fixture row reads its width through a `GeometryReader` — the one probe an
   ARCHIVED activity render honours; `@State` written from a measurement never
   re-renders there — with its greedy height pinned from the same `UIFont`
   metrics the row draws with (`Geometry.fixtureHeight`), so a font change
   moves the pin itself. Measured result: the report's 351pt class now renders
   at **1.00 scale even with a two-digit score** (it was the broken class);
   296 holds 0.78 typical / 0.61 worst, intact.
4. **Counts and clocks never give; names and codes do.** The score cluster
   carries `fixedSize()` + `layoutPriority(1)` — it was the only primary text
   with no guard, and it giving way first WAS the clipped-digit bug. The
   abbreviation scales to `Geometry.abbrFloor` (0.4) and the meta lines to
   `metaFloor` (0.6) — ⚠ these are never-truncate VALVES, not targets: SwiftUI
   scales only as far as the shortage demands, the readability assertion holds
   the real-device line, and the floor only opens fully in the measured corner
   (296pt card × two-digit score), where a small code beats a wrong one. The
   island pieces take the same rule (`ScoreLine` scales at `islandFloor` 0.7
   rather than `fixedSize` — an overflowing compact score clips at the sensor
   housing, which no layout priority argues with).
5. **Negative kerning never rides on a count or a clock.** SwiftUI lays a
   kerned `Text` out at its reduced width but paints the full glyph advance —
   the trailing glyph draws past the frame and clips. The score's −1 and the
   kickoff time's −0.4 are deleted (between two digits the tightening was
   invisible anyway; Ed's call). The abbreviation keeps its −0.6 look with
   `Geometry.kernBleed` (1pt) of padding absorbing the overdraw.
6. **A `.dynamicTypeSize(...large)` cap on the card root and each island
   piece.** Every font here is a fixed `.system(size:)`, which Dynamic Type
   does not scale — the cap costs nothing today and bounds any future
   system-styled text on a card measured to 7pt of spare. The distortion
   mechanism was never text size; it was width.

## Consequences

- Any future edit to `MatchActivity.swift` runs the harness or is flying at
  one width again — the file header and `Geometry`'s docblock both say so.
- The harness mirrors a handful of literals it cannot reach (the card's 16pt
  padding, the side split, the abbreviation/meta fonts, the pre-match centre);
  each is marked `⚠ MIRROR` on both sides. Everything else it reads from
  `Geometry` or renders through the real structs.
- Heights moved within budget: live 153.0pt (was 152.5 — the font-metric pin
  rounds up), pre-match 124.0pt (was 121 — the pin holds the two-meta-line
  column even when one side's record is nulled). Both far under the 160 cap.
- The compact tier means a zoomed phone shows 36pt crests and a 30pt score —
  smaller than the design's, by measurement rather than accident. If design
  wants the narrow classes re-cut, the tier values are one `Metrics` literal.
- `ProgressView(timerInterval:)` draws a placeholder glyph under the harness's
  headless render — an artifact of the jig, not the card; ignore it in the
  PNGs.
