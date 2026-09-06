# 0117 — The league selector becomes a solid rail with a gliding liquid-glass plate

- **Date:** 2026-09-05
- **Status:** Accepted
- **Decided by:** Ed ("lets make a plan to add some smoothness or animation to
  the league selector … something similar to the way the main nav works. A
  rail and a plate of liquid glass … a solid rail like the nav with a glass on
  top", off an interactive mock with both treatments toggleable)
- **Amends:** [0089](./0089-league-chips.md) — the selected state's ground and
  the idle dim move off the chip; the double inversion itself stands

## Decision

`LeagueSwitch` trades its per-chip ink wells for **one solid capsule in the
nav's ink** (`Colors.dark.tabBar`, `Radius.pill`, inset by new
`Size.leagueRailPad` = 6) holding the marks, with a **liquid-glass plate that
GLIDES** to the tapped chip — the NativeTabs bar's construction, echoed. Both
tones share the one code path; only the slot height differs (52 crown / 36
ground, per [0116](./0116-crown-league-chips-larger-cut.md)).

- **The plate** is an `Animated.View` (translateX + width + reveal opacity)
  under the chips, `pointerEvents="none"`, carrying a
  `GlassView glassEffectStyle="clear"` behind the module-level
  `isLiquidGlassAvailable()` gate; where glass is missing it degrades to the
  segmented thumb's flat lozenge (`segThumb` + `accentRing` ring) — the
  [0090](./0090-clubs-bubbles-liquid-glass-and-trays.md)/[0096](./0096-next-up-goes-liquid-glass.md)
  pattern. Trap 59's rule holds by construction: the plate refracts only the
  rail's own ink; chips paint over it, nothing renders under it.
- **`Glide.spring`** (damping 26 / stiffness 340 / mass 1, ζ ≈ 0.70, settles
  ~300ms) is the app's SECOND spring, living beside `Deck` because `Motion`'s
  contract is durations-only. Tighter than the deck's — a control snapping to
  the finger, not a card in flight.
- **Measurement** is per-chip `onLayout` boxes keyed by slug (widths are equal
  in practice but the text branch isn't guaranteed to match). The first
  placement is an ASSIGNMENT, never a slide-in — segmented.tsx's `placed`
  rule — and `useReducedMotion()` turns every animation here into an
  assignment.
- **The mark still lights up** (0089's double inversion) but as a
  `Motion.quick` crossfade timed to the plate's arrival: grayscale
  `FilterImage` and full-colour `Image` stay mounted and swap opacity. The SVG
  path keeps 0089's opacity-only approximation, now ramped by the same value.
- **`hapticToggle()` ticks on selection** — change-only, fired at the tap.
  Deliberately NOT the deck's rising-edge sentinel: selection commits the
  instant the tap lands; the glide is decorative, and a haptic tied to its
  arrival would lag the state change by ~300ms.
- Explicitly NOT chosen by Ed: press-scale feedback (the 0.7 pressed opacity
  stays), scroll-into-view on tap, and any change to onboarding's
  `LeaguePills`.

## Consequences

- The rail stands 12pt taller than its chips (64 crown / 48 ground) — it eats
  crown-band height that 0116 calibrated without it. ⚠ `leagueRailPad` is
  device-judged, the `groundLift` lesson.
- Recorded divergences: the text-branch chip (artwork-less league) swaps
  colour instantly, no crossfade; and with both tones on ink, its idle colour
  is now `textFaint` on both grounds (the crown's dark `onCrownDim` would
  vanish on the rail).
- `onCrown`/`onGround`/`idleCrown` chip styles are gone — selection's ground
  and ring live on the plate; the idle dim (0.72) is the chip's animated
  opacity ramp.
- The plate animates `width` — a layout prop — knowingly: slots are
  equal-width in practice, so that spring only runs for the text-branch
  outlier.
- Call sites are untouched (`matchdays.tsx`, `table.tsx`, `clubs.tsx`): props
  and the screens' `useState` selection stay as they are.
- Mock (both treatments, degraded states, motion spec):
  https://claude.ai/code/artifact/3255f8d9-be36-473a-8059-27f7fd8a8340
