# 0216 — 3D and touch on the pitch

- **Date:** 2026-09-26
- **Status:** Accepted
  - The 3D rest view, a 30°/45° view and the probe were verified on the
    simulator.
  - Gestures are NOT verified: a headless simulator cannot be driven.
- **Decided by:** the `handoff_lineup/` design.

## Decision

- **Gestures run simultaneously** (RNGH):
  - `Pan` (6pt, one finger): pans a zoomed flat pitch; orbits in 3D, 0.4°/pt
    spin and 0.2°/pt tilt within 14–64°.
  - `Pinch`: 70–260%, snapping home at ≤101%, with the pan following the
    focal point, clamped to `(zoom − 1) · 200` and ×1.4 vertically.
  - `Rotation`: 3D only.
- **Persisted on gesture END only** (`onCameraEnd`), never per frame. Reset
  returns to 0° and 34°. Flip turns flat 180° or adds 180° in 3D. Rotation eases
  to the nearest equivalent angle.
- **Taps are `Pressable`s**, so VoiceOver reaches every slot.
  - A native pan cancels their touch, and an 80ms guard drops a tap that ends a
    gesture.
- **The gesture is built by a function the JSX calls**, as `board-stack`'s drag
  is, and closures that leave the hook write with `.set()`. A bare `.value =`
  there reads to the React Compiler as mutating a frozen value.

## Consequences

- One-finger drag is the camera, so placing by drag is gone
  ([0065](./0065-starting-xi-builder.md)'s drag-to-swap and long-press menu).
- Pan against the pushed builder's edge swipe-back is untested.
