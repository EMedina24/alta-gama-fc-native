# Splash screen — build spec

Launch animation for Alta Gama FC. One cycle is **3800 ms**: a **2500 ms** splash,
then the Board holds for 1300 ms. In the app there is no loop — the splash plays
once and the Board is live at 2500 ms.

Files here:

| File | What it is |
| --- | --- |
| `altagama-splash.html` | Self-contained reference build. Open in any browser; Replay / Play-once controls sit under the phone. |
| `mark-accent.svg` | The pitch mark, lime `#c8f25a` — the strike state. |
| `mark-dark.svg` | The pitch mark, ink `#0d1a08` — the state on lime. |

Source of truth: `AltaGama FC Splash.dc.html` in the design project.

## Timeline

All easings are CSS cubic-bezier. Times are from launch.

| Time | Layer | Change | Easing |
| --- | --- | --- | --- |
| 0 | Base | Screen is `#08090a` | — |
| 240 ms | Mark (lime) | Strikes on: opacity 0→1, scale 1.14→1 | `.16,.9,.3,1` |
| 240–610 ms | Glow | Radial lime bloom behind the mark, opacity .9→0, scale 1→1.7 | `.16,.9,.3,1` |
| 300 ms | Mark (lime) | Flicker dip to opacity .22 | linear |
| 380 ms | Mark (lime) | Back to opacity 1 — strike complete | linear |
| 560–1240 ms | Sweep | White bar, 46% of screen width, `skewX(-14deg)`, `translateX(-150% → 160%)`, `mix-blend-mode: overlay` | `.5,0,.2,1` |
| 560–1240 ms | Lime sheet | Wipes in behind the sweep: `clip-path: inset(0 100% 0 0) → inset(0)` | `.62,0,.2,1` |
| 1240 ms | Mark (lime) | Out — the sheet now carries the mark in ink | — |
| 1140–1400 ms | Lockup | Mark (ink) + `ALTA GAMA FC` rise together: opacity 0→1, translateY 10→0, tracking .2em→-.02em, mark scale .94→1 | `.22,.9,.2,1` |
| 1220–1460 ms | `FIXTURE CLUB` | Rises a beat later: opacity 0→1, translateY 8→0 | `.22,.9,.2,1` |
| 2050 ms | Lockup | Out: opacity→0, mark scale→1.06, wordmark translateY -8 | `.22,.9,.2,1` |
| 2050–2500 ms | Lime sheet | Collapses into the crown: `clip-path: inset(0) → inset(0 0 100% 0)` | `.62,0,.2,1` |
| 2050–2500 ms | Board | Fades up under it: opacity 0→1, scale 1.035→1 | `.22,.9,.2,1` |
| 2500 ms | — | Board interactive | — |

The collapse and the Board fade run together on purpose: the lime does not lift
off the screen, it *becomes* the Board's crown.

## Values

- Base black `#08090a`
- Lime sheet `linear-gradient(168deg, #d6f96a 0%, #c8f25a 36%, #9bd96b 100%)`
- Ink on lime `#0d1a08`; `FIXTURE CLUB` at `rgba(11,22,8,.6)` (the `onAccent` set — never grey on lime)
- Mark: 132 × 94 pt drawn from the 42 × 30 viewBox, stroke 2.5, centred, top edge at 318 pt on a 852 pt screen
- Strike glow: `radial-gradient(closest-side, rgba(200,242,90,.55), transparent 70%)`, 440 pt circle, 14 pt blur
- `ALTA GAMA FC` — Archivo 900, 34 pt, baseline block at 440 pt
- `FIXTURE CLUB` — Archivo 800, 11 pt, tracking .32em, at 486 pt

## Notes for the native build

- Status bar stays light through the splash and switches to the on-accent ink
  when the Board's crown takes over (the crown is full-bleed under the status bar).
- The Dynamic Island is hardware — nothing is drawn behind it.
- If the app is warm and the Board is ready before 2500 ms, hold the full
  timeline anyway; cutting the splash short reads as a glitch. If the Board is
  NOT ready at 2500 ms, hold the lime sheet at full and delay only the collapse.
- Reduce Motion: skip to the lockup at full opacity on the lime sheet, hold
  600 ms, cross-fade to the Board. No sweep, no strike flicker, no scale.
