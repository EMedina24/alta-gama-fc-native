# 0119 — The league plate takes the nav's material

- **Date:** 2026-09-05
- **Status:** Accepted
- **Decided by:** Ed ("I noticed the liquid glass effect isnt the same as the
  one in the nav", comparing the rail against the tab bar on the simulator)
- **Amends:** [0117](./0117-league-rail-liquid-plate-slide.md) — the plate's
  glass style and interactivity flags

## Decision

The selection plate's `GlassView` switches from `glassEffectStyle="clear"` to
**`"regular"` with `isInteractive`** — the full Liquid Glass material the
NativeTabs selection lozenge wears.

- 0117 reached for "clear" because that is the repo's glass convention
  ([0090](./0090-clubs-bubbles-liquid-glass-and-trays.md)/[0096](./0096-next-up-goes-liquid-glass.md))
  — but those are SURFACES behind content, where the subtler variant is the
  point. This plate impersonates a system CONTROL, and next to the real bar
  one screen edge away, "clear" read flatter than the thing it echoes.
- `isInteractive` was explicitly left off in 0117 ("the plate is decorative");
  reversed here because the material's interactive rendering is part of the
  nav look, which is the whole brief. The wrapper keeps
  `pointerEvents="none"` — touches still belong to the chips and the pan.
- The `< iOS 26` fallback (flat `segThumb` + `accentRing`) and everything
  else in 0117/0118 stand.

## Consequences

- "Clear" remains the convention for glass SURFACES; controls that
  impersonate system chrome take "regular" — record the tone choice per use.
