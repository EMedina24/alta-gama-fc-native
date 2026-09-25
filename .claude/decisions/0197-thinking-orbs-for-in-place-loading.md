# 0197 — Thinking orbs for in-place loading

- **Date:** 2026-09-25
- **Status:** Accepted
- **Decided by:** Ed, via the Medina adoption plan
  ([0193](./0193-medina-digital-becomes-the-design-system.md), phase 5).
  - **The renderer changed from the plan.** The plan said Skia; this entry
    draws with `react-native-svg` instead. Why is below; Ed should confirm.

## Context

The Medina kit's loading mark is the thinking orb from `thinking-orbs` (MIT ©
Jakub Antalik): a dotted 3D sphere with named states. Its rules:

- pull-to-refresh, inline in buttons and chips
- never a full-screen first load
- one per view

The kit's RN port draws it with `@shopify/react-native-skia`. It records a
Skia picture and calls `setState` on every animation frame from the JS thread,
and its README says the port was never run on a device.

## Decision

1. **`thinking-orbs` 0.3.2, pinned exactly.** We import only its `./engine`
   export.
   - The engine is about 26 KB of pure JS, with no DOM access and no native
     code.
   - Its `MODE_FRAMES` return a finished frame: dots and lines, z-sorted and
     radius-clamped, ready to draw.
2. **Drawn with `react-native-svg`, not Skia.**
   - `react-native-svg` is already a dependency.
   - Because the frame is already final, any 2D renderer draws the same
     picture.
   - Skia would have added a large native dependency and a dev-client rebuild,
     for a 20pt spinner.
   - Re-renders are capped at `OrbMotion.fps` (30). The kit's 60 per second
     from the JS thread buys nothing visible at these sizes.
3. **`atoms/orb.tsx` — `Orb`:**
   - states `working`, `searching`, `solving`, `connecting`
   - sizes 20 and 64 (the engine's hand-tuned designs)
   - `tone` is `ink` or `accent` (the near dots go lime), and `on` is `dark` or
     `light`
   - under Reduce Motion it freezes on the `OrbMotion.still` pose
   - `accessibilityLabel` is required, because callers pass copy
4. **Uses:**
   - **`Button` `loading`:** the `solving` orb replaces `ActivityIndicator`.
     On a primary (lime) button it uses dark ink; on the other tones it is
     lime-tipped. The button now reports `busy`.
   - **`ScreenScaffold` pull-to-refresh:**
     - The native spinner is hidden with a transparent `tintColor`.
     - While `refreshing`, a `connecting` orb sits over the crown's top.
     - Its ink follows the old spinner rule: dark on the brand's bright band,
       light on a league's deep one (0165).
     - It is never lime-tipped, because the brand band is lime.
     - It is spoken as `copy.orb.refreshing` (Refreshing / Actualizando).
   - **`Skeleton` still owns first load.**
5. **`?only=orb` in the `_debug` gallery** shows every state, both sizes, both
   tones, and the three loading buttons.

## Consequences

- No native change, so no rebuild. It shipped over Metro and was verified on
  the iOS 26.5 simulator:
  - all states render
  - two screenshots differ, so it animates
  - the button swap works
- A 64pt orb is about 150 SVG nodes re-rendered 30 times a second. That is
  fine for one orb per view, which is the kit's rule anyway. If an orb ever
  has to run for minutes, move the engine onto the UI thread (it is written to
  be worklet-safe) before reaching for Skia.
- While the reader is still pulling, before release, nothing is drawn. The
  kit accepts that.
- **Not verified:**
  - a real pull-to-refresh, which needs a synthetic drag
  - Reduce Motion
  - VoiceOver

## Alternatives considered

- **Skia, as the kit ships it.** Rejected in point 2 above.
- **Keep `ActivityIndicator` and the native spinner.** Then the kit's loading
  language never appears.
