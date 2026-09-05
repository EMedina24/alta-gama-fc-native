# 0115 — Widget tiles take a lifted ground

- **Date:** 2026-09-05
- **Status:** Accepted
- **Decided by:** Ed ("can we make it a bit lighter then please", after the
  transparency measurement in [0114](./0114-widgets-under-system-glass.md))
- **Amends:** [0104](./0104-widgets-adopt-the-app-shell.md) — the tile ground
  is no longer the app's `#0f1316` verbatim; it is that ground plus one
  painted lift

## Context

Ed wanted the default-appearance widgets more transparent — "a dark glass
transparent". 0114 measured that impossible: container-background alpha
composites over BLACK, never the wallpaper, so alpha only darkens. Lightening
the paint is the one lever the default appearance has, and Ed asked for it.

0104 matched the tile ground to the app's `#0f1316` so a tile never looks "a
step darker than the app it opens". But the two surfaces sit in different
contexts: the app's ground fills the display, while a tile floats on a
wallpaper that is usually darker than it — where `#0f1316` read near-black.

## Decision

`MeshPlate` paints **`Tok.groundLift` — `white.opacity(0.09)` — over
`Tok.ground`, UNDER the pools** (`Shell.swift`), widgets only. (Converged
twice: simulator rounds landed 0.045 — 0.06 "too light", 0.03 too dark — and
then the DEVICE pass overruled it: on the phone's OLED against Ed's wallpaper
0.045 still read "too dark", and the value doubled. ⚠ The simulator on a Mac
display reads LIGHTER than hardware; final taste calls on this token belong
to a device.)

- **A lift, not a second hex**, so the relationship to the app's ground stays
  explicit: remove the overlay and the tile is the app again. `Tok.ground`
  itself is untouched — it mirrors `theme.ts` and the app still owns it.
- **Under the pools**, so the calibrated `MeshTile` colours ride a lighter
  base rather than being washed toward white from above (the alphas 0104
  calibrated stay meaningful).
- Full-color mode only, by construction — the lift lives inside `MeshPlate`'s
  `.fullColor` branch; Tinted/Clear rendering still gets no ground of ours
  (0114).

## Consequences

- The tile is now deliberately one step LIGHTER than the app screen it opens
  — reversing 0104's exact-match rationale for the wallpaper context, on
  Ed's call.
- ⚠ 0.09 is a taste value, and it is DEVICE-calibrated: the simulator rounds
  settled 0.045, which the phone then read as still too dark. Judge any
  future change to this number on hardware, not the Mac's rendering of the
  simulator. Tune it as one number in `Tokens.swift`; do not compensate by
  touching `Tok.ground` or the `MeshTile` alphas.
- The glass panels (`glassFill` white .06) sit on a lighter base and read
  slightly softer; accepted — the hairline still delineates them.

## Alternatives considered

- **Lightening `Tok.ground`** — rejected: the token mirrors the app's
  `theme.ts` `background` and the app must not lighten with it.
- **Brightening the `MeshTile` pool alphas** — rejected: changes the tile's
  character (more colour, not more light) and reopens 0104's calibration.
- **Translucency** — measured impossible in 0114.
