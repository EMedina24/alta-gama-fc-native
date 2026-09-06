# 0128 — The widget tiles take a TRAY SHELL: tray, inset plate, corner glow

- **Date:** 2026-09-06
- **Status:** Accepted — typechecked at every floor; simulator pass pending
- **Decided by:** Ed (`handoff_widget-redo/`'s shell, extended by his call to
  ALL THREE widgets including the glow; asked in-session)
- **Supersedes:** [0126](./0126-widget-plate-goes-black.md) — the plain-black
  single plate, same-day
- **Amends:** [0125](./0125-widget-plate-goes-flat.md) — solid-opaque and the
  no-full-tile-gradient ruling stand; "no more gradient" is NARROWED: it was
  aimed at the aurora mesh, and the handoff's corner glow is an Ed-approved
  one-corner decoration. [0114](./0114-widgets-under-system-glass.md)'s mode
  contract is unchanged: Tinted/Clear/vibrant still get `Color.clear`

## Context

The widget-redo handoff draws YOUR WEEK inside a new shell: an outer tray
(radius 23, `white 5%` fill, hairline border) holding an inner plate 2pt
inside it (radius 21, `#0b0d0f`, a 0.5pt lit top edge) under a lime radial
corner glow. Ed extended the shell beyond the medium tile: NEXT (small) and
NEWS change background too — "match this one's redo", glow included — so the
three home-screen tiles stay one family. For NEXT and NEWS this is paint
only; their content is untouched.

## Decision

`MeshPlate` (`targets/widget/Shell.swift`) paints the tray shell in
`.fullColor`; every other rendering mode keeps getting `Color.clear` (0114).
One view, all three `containerBackground` call sites — no widget file changed.

- **No radius in the shell is OURS** (0085 §1's double-round trap, still the
  law). The tray's corner is the system's own container mask (the fill runs
  edge-to-edge); every inner corner is `ContainerRelativeShape().inset(by: 2)`
  — an `InsettableShape`, so the plate stays CONCENTRIC with the container on
  every device, which is the handoff's "radii stay concentric at any size"
  without ever writing 23 or 21. ⚠ `ContainerRelativeShape` resolves the
  container's corner only in a widget context (elsewhere: rectangle) — safe
  because `MeshPlate` draws only as `containerBackground`.
- **`Tok.plate` repoints** `Color.black` → `#0b0d0f` (0126's colour ends at
  one day old). **`Tok.trayFill`** is new and OPAQUE `#17191b` — the mock's
  `white 5%` PRE-composited over the plate, because container-background
  alpha composites over BLACK, never the wallpaper (0114's measurement): a
  literal `.05` wash renders `#0d0d0d`, indistinguishable from the plate,
  erasing the very step the tray exists to draw. **`Tok.trayLine`** =
  `white .09` at 0.5pt (the mock's `1px` at 2×), on the container edge.
- **The plate's lit top edge** is `Tok.hairline` (`white .10`, the mock's
  value) stroked on the INSET shape and masked to a top fade — GlassSurface's
  idiom — so it follows the plate's corner instead of ruling straight across
  the tray. The old flat 1pt `plateTop` rule goes; `Tok.plateTop` stays
  (`GlassSurface` draws it).
- **The corner glow** is the mock's
  `radial-gradient(58% 78% at 100% −10%, lime .16 → clear 64%)`, built by the
  0104 recipe because `EllipticalGradient` cannot take independent rx/ry
  (trap 50): a `2rx × 2ry` frame positioned at the mock's centre, clipped to
  the plate shape. Percentage-based, so it scales across small/medium/large.
  Decoration only, never a data channel — the old `Plate` rule.

## Consequences

- The tile is again NOT the app it opens (0126 already ended that mirror);
  the shell is now the handoff's, full stop. The lever for any device
  re-judgement is the token set (`plate`, `trayFill`, `trayLine`), not paint
  in `MeshPlate`.
- 0125's system-sheen note stands: the neutral top glow in screenshots on
  iOS 26 is the system's widget-glass lighting, not ours — do not chase it.
- `MeshPlate` keeps its name a second time (0125's rationale — ADRs and
  comments across the target refer to it).
- A tinted/Clear home screen shows NONE of this shell, by 0114's contract —
  the system's slab is the shell there.
- Needs a new native build to reach a device.

## Alternatives considered

- **Literal `white 5%` tray fill** — measured impossible: composites over
  black into the plate's own darkness (0114).
- **Hardcoded 23/21 radii** — the exact double-round 0085 §1 caught; and the
  system's corner varies by device, so hardcoding also breaks concentricity.
- **Shell on the medium tile only** — declined by Ed: one family, three
  tiles, glow included.
- **Keeping the black plate under the tray** — the handoff's plate is
  `#0b0d0f`, and a black centre under a `#17191b` tray loses the mock's
  measured step between the two.
