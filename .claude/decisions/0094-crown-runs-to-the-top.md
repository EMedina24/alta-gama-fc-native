# 0094 — The crown runs to y = 0 as a fixed-height layer, and the status bar adapts

- **Date:** 2026-09-01
- **Status:** Accepted — verified on the simulator (all four tabs; dark glyphs at rest, light after scrolling was exercised by eye only)
- **Decided by:** Ed Medina, live on the simulator ("make the crown reach all the way to the top", "the crown in all other screens needs to match the clubs screen")
- **Amends:** [0087](./0087-crown-aurora-shell-adopted.md) decisions 9 (crown-below-status-bar) — REVERSED — and the crown's box-fraction gradient

## Context

0087 put the crown below `insets.top`, reading the mock's dark status-bar
strip literally. On the device it read as a dead band above the colour. And
once the crown reached the top, a second fault surfaced: `CrownGrad`'s stops
were FRACTIONS of the crown's box, so a short crown (Table; idle Today)
compressed the whole ramp — its title sat on mid-teal while Clubs' identical
title sat on lime, because Clubs' payload made its box tall.

## Decision

1. **The gradient is a FIXED-HEIGHT layer**: `topInset + CrownRamp` (432 — the
   mock's own number: its Clubs screen draws the gradient as a 432px layer
   behind overflowing content), anchored at the top of the screen, absolutely
   positioned inside the crown. Content-driven crown HEIGHT survives; only the
   PAINT is fixed. A crown shorter than the layer lets the fade run on behind
   the body (the box does not clip — a clip would put a hard edge exactly at
   the hand-off); a taller one ends past it, where the layer is already
   transparent. Every screen now shows the same colour at the same distance
   from the top, which is what "match the Clubs screen" means mechanically.
2. **The crown's content pads down by the inset** (`topInset` prop) — padding,
   never a margin, which would drag the layer down with it.
3. **The status bar flips with the scroll.** White glyphs on lime and black
   glyphs on the mesh are each unreadable, so neither app-wide style is
   correct: the scaffold renders `StatusBar style="dark"` while the bright
   band is behind the bar and `light` once scrolled past. The threshold is
   arithmetic off the fixed layer (`(topInset + CrownRamp) × 0.42 − topInset`)
   — no measuring — and the boolean-valued `setState` in `onScroll` re-renders
   only on crossing, not per frame. ⚠ Gated on `useIsFocused()`: a blurred tab
   under a pushed club page must not hold the bar dark over that screen.
4. The root layout keeps `StatusBar style="light"` as the default every
   crownless screen inherits.

## Consequences

- `Crown` lost its height-measuring state and `onHeight` callback — the fixed
  layer made both unnecessary.
- The club page and News begin at `insets.top` on the MESH with light glyphs,
  which is why they take no crown and no flip.
- Table's rows and Matchdays' strip now sit on the gradient's tail, as the
  mock's Clubs chips row always did.
