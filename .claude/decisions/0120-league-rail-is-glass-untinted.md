# 0120 — The league rail is glass, and untinted

- **Date:** 2026-09-05
- **Status:** Accepted
- **Decided by:** Ed ("it still doesnt match the main nav rail", twice, against
  simulator screenshots of the rail beside the bar)
- **Amends:** [0117](./0117-league-rail-liquid-plate-slide.md)/[0118](./0118-league-rail-static-and-plate-drags.md)
  — the rail's ground; [0119](./0119-league-plate-takes-the-navs-material.md)
  stands and gains a colour scheme

## Decision

The rail's ground becomes a **`GlassView glassEffectStyle="regular"
colorScheme="dark"` — untinted** — behind the plate and chips; the flat
`tabBar` paint survives only as the `< iOS 26` fallback (`railFlat`).
The plate keeps 0119's regular interactive glass and pins the same
`colorScheme="dark"`, so the bright crown behind it cannot flip either piece
to the light appearance.

Two findings, both screenshot-judged against the real bar:

1. **Flat paint was the first mismatch.** 0117 called the rail "solid" after
   the bar's look, but the NativeTabs bar is the system's MATERIAL, not
   paint — smoky, translucent, rim-lit, content ghosting through. A flat
   `#0a0b0c` capsule read matte beside it.
2. **A `tabBar` tint was the second.** The obvious fix — glass tinted with the
   bar's colour — crushed the material to solid black: an opaque `tintColor`
   defeats the translucency that IS the look. The bar's darkness is the
   untinted dark-appearance material over dark content, nothing more.

## Consequences

- On the bright crown the rail reads GREEN-GLASS, visibly lighter than the
  bar over the dark body — that is the material adapting, which is the
  authentic nav behaviour, not a bug. If Ed wants it darker the dial is a
  PARTIAL-alpha tint (never an opaque one), device-judged.
- Idle marks gained legibility for free — Bundesliga's dark wordmark was
  invisible on the black fill and reads on the material.
- Nearby content (the jornada chips) faintly refracts through the rail's
  edge — the bar does the same to the list under it; trap 59's "refracts the
  screen's own ground" rule is satisfied, deliberately.
- Glass-on-glass (plate riding rail) renders cleanly without a
  `GlassContainer`; none was needed.
