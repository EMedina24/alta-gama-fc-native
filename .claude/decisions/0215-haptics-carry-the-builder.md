# 0215 — Haptics carry the builder; no sound

- **Date:** 2026-09-26
- **Status:** Accepted. Not felt on a device yet: the simulator has no haptic
  engine.
- **Decided by:** Ed, choosing haptics only over adding a chime.
- **Amends:** [0065](./0065-starting-xi-builder.md)'s "nothing on remove".

## Context

The handoff plays a sine-and-triangle chime on every placement, bench move,
mirror, clear and save. The app ships no audio module. `expo-audio` would be a
new native dependency and a dev-client rebuild.

## Decision

`hapticFor(XiEffect)` in `lib/haptics.ts`, the one importer of `expo-haptics`:

| Effect | Haptic |
|---|---|
| placed, loaded | Light |
| swapped, mirrored | Rigid |
| benched | Soft |
| removed, reshaped | selection tick |
| cleared | Warning |
| saved | Success |
| deleted | none (the confirm was the moment) |

Every action goes through `actXi` = `dispatchXi` + `hapticFor`, so none can
land silently or buzz without landing.

## Alternatives considered

- **`expo-audio` with bundled tones.** It needs a native rebuild and a sound
  setting, for feedback the phone already gives through haptics.
