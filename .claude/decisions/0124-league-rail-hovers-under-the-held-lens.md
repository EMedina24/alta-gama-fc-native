# 0124 — The rail hovers under the held lens

- **Date:** 2026-09-06
- **Status:** Accepted
- **Decided by:** Ed ("when holding down on the glass lense, the entire rail
  raises or hovers … mimic the main nav as much as possible"; corrected on
  the first cut: "the rail is shifting up. the main nav stays in position
  but hovers … think of it more like the rail is supposed to get bigger")
- **Amends:** [0122](./0122-league-plate-two-states-lens-under-finger.md) —
  a third companion to the lens's touch state

## Decision

While the lens is up, the rail **GETS BIGGER in place**: its capsule
backdrop inflates `Glide.hover` (3pt — first cut 4, eased on Ed's call) on
every edge on the `Glide.spring`,
and settles back on release. Same triggers as the lens (`onTouchesDown` on
the plate's span, or the pan activating; dropped by `onFinalize`), so plate,
swell, and hover move as one gesture response.

- **The first cut translated the whole rail up 6pt and was wrong** — the nav
  bar does not move, it swells where it stands (Ed, comparing on the
  simulator).
- **Only the backdrop grows.** The capsule (glass, or the flat pre-26 fill)
  is split from the layout box onto its own absolutely-positioned layer, and
  the hover animates that layer's INSETS negative. Chips, plates, the
  magnifier, `onLayout` boxes, and the gesture's coordinate frame never
  move — no compensation anywhere.
- **Bounds, never a transform**: a scale would sit a transform over glass
  (0122's finding 3); animated insets resize the effect view natively, the
  same operation the lens's swell uses.
- Reduce Motion: no hover.

## Consequences

- Mid-hold the capsule overlaps surrounding content by ≤3pt per edge —
  transient, finger-down only; `Glide.hover` is the dial, device-judged.
- The rail's pill radius lives on the backdrop layer now; the layout box has
  no visual of its own.
- No shadow is added to sell the hover: RN shadows on glass misbehave, and
  growth plus the lens swell reads as the nav's gesture already.
