# 0121 — The league plate is the lens

- **Date:** 2026-09-06
- **Status:** Accepted
- **Decided by:** Ed ("what i mean is the glass pane effect. see screenshot" —
  a close-up of the nav's drag lozenge mid-drag: transparent, magnifying,
  chromatic at the rim)
- **Amends:** [0119](./0119-league-plate-takes-the-navs-material.md) — the
  plate's style flips regular → clear; the interactive flag it added stays
  and turns out to be the load-bearing half

## Decision

The plate's `GlassView` becomes **`glassEffectStyle="clear"` +
`isInteractive`, untinted and scheme-free** — the LENS the NativeTabs bar
shows under the finger.

The three-step walk that got here, all screenshot-judged:

1. 0117's `clear` WITHOUT interactive is a flat translucent wash — the thing
   Ed first rejected.
2. 0119's `regular` (+ interactive) is the frosted smoke — closer, but the
   effect Ed was pointing at all along was the drag bubble.
3. `clear` WITH `isInteractive` is a different material from both: the
   transparent magnifying lens with the chromatic rim. **The interactive
   flag is what turns "clear" into the lens.**

The rail keeps [0120](./0120-league-rail-is-glass-untinted.md)'s untinted
regular dark glass; the `< iOS 26` flat fallback stands. The plate carries no
`colorScheme` — the lens has no appearance of its own, it is what it
refracts.

## Consequences

- At rest the selection reads as a luminous clear lozenge; the lens
  qualities — magnification, edge distortion — show in MOTION, so the glide
  and drag are where this is judged. Simulator statics confirm the material
  switched; the feel is a device check.
- Glass grammar as it now stands: surfaces take `clear` non-interactive
  (0090/0096), chrome impersonators take `regular` (0119, now the RAIL's
  role via 0120), and the one finger-following element takes the lens.
