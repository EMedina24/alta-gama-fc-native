# 0126 — The widget plate goes black

- **Date:** 2026-09-06
- **Status:** Superseded by [0128](./0128-widget-tiles-take-a-tray-shell.md) — the tile is a tray shell now (`#0b0d0f` plate inside a `#17191b` tray, corner glow); black lasted a day
- **Decided by:** Ed ("lets just make the widget background a black color
  please", looking at 0125's lifted slate on the simulator)
- **Supersedes:** [0115](./0115-widget-tiles-take-a-lifted-ground.md) — the
  lift is gone entirely, `Tok.groundLift` deleted
- **Amends:** [0125](./0125-widget-plate-goes-flat.md) — COLOUR only; its
  no-gradient / solid-opaque / keep-the-top-edge decisions and its
  `Tok.mesh`-stays reasoning all stand

## Context

0125 flattened the tile to `ground` + 0115's 0.09 lift — a uniform lightened
slate. Seeing it live, Ed called it down to plain black. That ends the tile's
relationship to the app's ground: 0104 matched the app's `#0f1316` exactly,
0115 lifted it for the wallpaper context, and black tracks neither.

## Decision

`MeshPlate` paints **`Tok.plate` — `Color.black`** — under the existing 1pt
`Tok.plateTop` rule. New token in `Tokens.swift`; `Tok.groundLift` is deleted
(MeshPlate was its only consumer — 0123's dead-servant rule).

- **`Tok.ground` stays but is UNPAINTED** — it is the app-mirror reference
  `activityGround` and `scrim` compare themselves against; its doc says so.
- The rendering-mode branch is untouched: Tinted/Clear still get
  `Color.clear` (0114), and opacity stays full (0114's alpha-over-black
  measurement — moot on black, but the branch structure is unchanged).
- The 1pt lit top edge stays — Ed kept it in 0125 and asked only about the
  background colour here; on black it is the tile's one piece of decoration.

## Consequences

- 0115's device-calibration ritual for the lift is history — there is no
  lift. If black reads wrong on the phone, the lever is `Tok.plate` itself.
- The tile no longer matches the app it opens (0104's original rationale,
  already narrowed by 0125, now dropped for the ground): black tile, `#0f1316`
  app. Ed's call, twice over.
- `GlassSurface` panels (white .06 fill) sit on pure black and read slightly
  crisper; the 0.5pt hairline still delineates them.
- 0125's system-sheen note still applies: the faint neutral top glow in
  screenshots is iOS's own widget-glass lighting, and on black it is the only
  brightness variation left — do not chase it out of `MeshPlate`.

## Alternatives considered

- **Bare `Tok.ground` (`#0f1316`)** — the near-black already declined in
  0125; Ed asked for black, not the app's ground.
- **Repointing `Tok.ground` to black** — rejected: the token documents the
  app mirror and other tokens' docs measure themselves against it.
