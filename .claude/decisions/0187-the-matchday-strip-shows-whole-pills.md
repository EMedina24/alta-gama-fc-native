# 0187 — The matchday strip shows whole pills

- **Date:** 2026-09-24
- **Status:** Accepted
- **Decided by:** Ed. He sent a screenshot of the Matchdays strip with the
  `9` pill cut down the middle against the pinned CALENDARIO pill and asked to
  *"clean up this slider"*. He scoped it to that one fix: heights, played-round
  styling and a divider were offered and not picked.
- **Amends:** [0165](./0165-the-league-crown-goes-deep-and-the-head-restructures.md). The pinned `trailing`
  control stays; only the scroller beside it changes.

## Context

0165 pinned the Calendar pill beside the round scroller, which then took
whatever width was left. The auto-scroll already lands the LEFT edge on a pill
boundary (the `SLOT` fix in `matchday-strip.tsx`). The RIGHT edge was never
aligned, so the last visible round was sliced wherever the Calendar pill
happened to start. A manual drag could also come to rest mid-pill on either
side.

## Decision

1. **A pinned strip's viewport is a whole number of slots.** A wrapper measures
   the room with `onLayout`. The ScrollView then takes
   `fit × SLOT − Spacing.two`, where `fit = ⌊(room + gap) / SLOT⌋`, with a
   minimum of 1. The remainder (less than one slot) stays empty and reads as
   part of the gap before the Calendar pill. Before the first layout the
   scroller renders unconstrained, as it did before.
2. **A pinned strip snaps to slots**: `snapToInterval={SLOT}`, with
   `decelerationRate="fast"` and `disableIntervalMomentum`. This is the drag's
   version of the `SLOT` rule. `trackPinned` has no tail pad, so the end of the
   track is also on the grid and the last round lands flush.
3. **The full-bleed strip (no `trailing`) is unchanged.** Its tail pad is off
   the grid on purpose.

## Alternatives considered

- **An edge fade.** The band behind the strip is a league gradient, so a
  solid-colour fade can't match it. A real alpha mask needs
  `@react-native-masked-view`, which isn't installed. A fade would also keep
  showing a partial pill, just a softer one.

## Consequences

- The gap before the Calendar pill varies by up to one slot (42pt), depending on
  the screen width and the length of the pill's label (CALENDARIO vs CALENDAR).
