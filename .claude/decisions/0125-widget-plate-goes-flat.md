# 0125 — The widget plate goes flat: one solid colour, no mesh

- **Date:** 2026-09-06
- **Status:** Accepted — typechecked at the 17.0 floor; NEXT and TU SEMANA
  pixel-swept flat on the iOS 26.5 simulator (zero hue variation, rows
  constant), NEWS unplaced on the sim home screen but shares `MeshPlate` by
  construction. Ground COLOUR **superseded by
  [0126](./0126-widget-plate-goes-black.md)** (same day) — the plate is plain
  black; the no-gradient / solid-opaque / top-edge decisions stand.
  **No-gradient NARROWED by [0128](./0128-widget-tiles-take-a-tray-shell.md)**
  (also same day): it was aimed at the full-tile aurora mesh, and the tray
  shell's one-corner lime glow is an Ed-approved decoration; solid-opaque
  stands
- **Decided by:** Ed ("make our homescreen widgets a single solid color …
  Right now they're this wierd gradient. please no more gradient")
- **Amends:** [0104](./0104-widgets-adopt-the-app-shell.md) — the `MeshTile`
  pools come OFF the widget ground; the rest of 0104 (the shell adoption,
  `GlassSurface`, the painted-glass finding, trap 52) stands.
  [0115](./0115-widget-tiles-take-a-lifted-ground.md)'s lift is untouched.

## Context

0104 put the app's aurora mesh on the widget tiles — `Tok.ground` under three
calibrated `MeshTile` pools — so the home screen would speak the same design
language as the app. On the device Ed read the result as "this weird gradient"
and asked for a single solid colour, "transparent" if possible.

Transparent is not on the table:
[0114](./0114-widgets-under-system-glass.md) measured that container-background
alpha composites over BLACK, never the wallpaper, so alpha only darkens. Asked
with that constraint spelled out, Ed chose **solid opaque** (see-through
remains the system's own Tinted/Clear modes, which already get `Color.clear`
from us) and chose to **keep both flat finishing touches** — the 0.09 lift and
the 1pt lit top edge — over a bare `#0f1316`.

## Decision

`MeshPlate` (`targets/widget/Shell.swift`) paints **one uniform colour**:
`Tok.ground` + `Tok.groundLift`, under the existing 1pt `Tok.plateTop` rule.
The `pools` overlay and its `GeometryReader`/`EllipticalGradient` machinery
are deleted.

- **`Tok.mesh` and `Pool` stay in `Tokens.swift`** — the Live Activity's
  floodlight (`MatchActivity.swift`) still samples `mesh[2].color`. Their doc
  comments now name that as the sole consumer.
- **The name `MeshPlate` stays.** ADRs and comments across the target refer to
  it; a rename is churn with no behaviour value. Its doc comment records that
  the mesh is gone.
- The rendering-mode branch is unchanged: `.accented`/`.vibrant` still get
  `Color.clear` (0114).
- Untouched, deliberately: the NEWS caption scrim, `GlassSurface`'s edge-fade
  mask, and the Live Activity floodlights — gradients, but not the widget
  background Ed was pointing at.

## Consequences

- ⚠ **A faint neutral top sheen still shows on every tile in screenshots, and
  it is NOT ours.** Post-change our paint is two flat fills plus a 1pt rule —
  nothing that can produce the ~50pt luminance ramp measured at the top of
  both tiles. It is horizontally constant, hue-free, and identical across
  tiles: the system's own widget-glass lighting on iOS 26. Do not chase it
  out of `MeshPlate`; there is nothing left in there to remove.
- The tile is one lightened slate (≈`#22282e` composite) with a lit hairline —
  quieter than the app it opens, which now keeps its mesh alone. 0104's
  "same design language" rationale is deliberately narrowed to ground hex +
  glass grammar, on Ed's call.
- 0104's `MeshTile` calibration (and its off-verbatim-copy warning) is now
  history, not live guidance, for the widgets; it still documents why
  `Tok.mesh`'s geometry differs from the app's `Mesh`.
- [0115](./0115-widget-tiles-take-a-lifted-ground.md)'s rules stand unchanged:
  0.09 is device-calibrated, tuned as one number, never compensated through
  `Tok.ground`.

## Alternatives considered

- **Semi-transparent solid** — offered, declined: 0114's measurement means it
  renders as a darker solid over black, not see-through.
- **Bare `#0f1316`, no lift/top edge** — offered, declined: the lift exists
  because the bare hex read near-black on real wallpapers (0115).
- **Deleting `Tok.mesh`/`Pool`** — blocked by the Live Activity's floodlight.
