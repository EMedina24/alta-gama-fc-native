# 0213 — The pitch is a plane seen through one camera

- **Date:** 2026-09-26
- **Status:** Accepted
  - The harness proves `projectPoint` against a port of RN's `operator*` and
    a model of the handoff's CSS scene, over 300 random views.
  - The on-device probe (`/_debug/xi?probe=1&view=3d&rot=30&tilt=45`) shows
    every native mark inside its projected ring.
- **Decided by:** the `handoff_lineup/` design, and this change's implementation
  calls.
- **Supersedes, in part:** [0065](./0065-starting-xi-builder.md) §4 (the board)
  and its Look clause; the board half of [0072](./0072-xi-portraits-on-the-board.md).
  0072's card half stands.

## Context

The handoff's pitch is a CSS 3D scene:
- a 520 × 800 plane under a `perspective: 1400px` parent;
- tokens as counter-rotated `preserve-3d` children, so they face the viewer;
- names below the token in flat, above it in 3D.

React Native has no `preserve-3d`: a child of a tilted view is flattened into
it.

## Decision

- **Geometry is the handoff's ladder** (`pitch-geometry.ts`): x from `LANES`
  keyed by row size, y evenly from the deepest band (26) to the attack (90),
  keeper at 9.
- **One camera, two renderers.**
  - The plane (markings in `viewBox 0 0 100 154`, stripes, shadows, ripple)
    takes the transform: `projection.ts`' `planeOps`, driven by Reanimated
    shared values.
  - The eleven tokens are an UNROTATED overlay, each placed at `projectPoint` of
    its slot and scaled by the depth there. Names stay upright, and a tap lands
    where the token is drawn.
- **RN's transform, as read in its C++:**
  - `resolveTransform` folds the list with `operator*`, which computes
    `rhs · lhs`, so a row vector meets the LAST op first.
  - Translation sits in row 3, and perspective is `m[11] = −1/p`.
  - The origin is the layer centre.
  - `{scale}` scales Z, so the ops use `scaleX`/`scaleY`.
  - CSS `scale()` never touches Z, so the perspective is `1400 × unit` points
    for a plane laid out at `unit` points per unit. Using 1400pt flattened the
    pitch by ~35%; the harness's CSS model caught it.
- **The first build corrected three handoff numbers:**
  - Flat keeps 44 units clear under the plane, so the keeper's name is not cut
    by the card.
  - While a hint shows, the plane fits above it.
  - The 3D centre is 53%, not 47%, or the attackers' names ride into the top
    bar.
- **Names are painted after every disc** (two passes), so no orb covers a
  name.
  - A pill may spill `Xi.pillSpill` into the neighbouring lane.
  - A two-word short name that will not fit falls back to its surname, keeping
    particles ("de Jong").
- **The pitch card is paint, not glass.** The small controls on the scene are
  real glass (`GlassPill`, `GlassIconButton`); a glass ancestor of a transformed
  plane is trap 64's cousin.
- **The export card keeps its own table** (`CARD_SLOTS` in `card-geometry.ts`).
  - It uses the same slot ids, which the harness asserts.
  - The ladder's four-band spacing collides on the 1:1 card, and ADR 0075's
    reserve was measured against the table.
  - The card is always Turf. `Look` (lines, turf, angled) and its sheet are
    gone.

## Consequences

- react-native-svg ignores the alpha of an `rgba()` stop colour. The pitch card
  first rendered as a white slab. Gradients here use solid inks with
  `stopOpacity`.
- The plane is rasterised at its layout size, so its lines soften at a 260%
  pinch. Tokens are laid out at 1.6× and scaled down, so they do not.

## Alternatives considered

- **One `{matrix}` op.** It works, but the op list is what Reanimated animates
  natively and what the harness can compare op by op.
- **Drawing the markings as projected SVG paths.** It is exact but repaints
  every frame of a gesture.
