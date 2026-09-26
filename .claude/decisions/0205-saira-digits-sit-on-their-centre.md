# 0205 — Saira digits sit on their centre; key players get portraits

- **Date:** 2026-09-25
- **Status:** Accepted
  - `tsc` is clean; lint is unchanged (the 5 errors and 1 warning were already
    there).
  - **Simulator-verified on an iPhone 17 Pro (iOS 26.5) against production,
    measured in pixel rows at 3×, not by eye:**
    - ring digits within 0.2pt of the ring's centre (Mallorca)
    - a spine score chip's digits 0.0pt off the chip's centre (Rayo)
    - the LAST RESULT board and the matchday pills checked by eye
    - key-player portraits on Villarreal
- **Decided by:** Ed, three reports in a row:
  - *"the main number sits too high"* (the SEASON SO FAR rings)
  - *"these numbers are also sitting a bit too high"* (the spine's "2 | 1"
    chips)
  - *"these should have player pictures"* (KEY PLAYERS)
- **Follows:** [0194](./0194-numbers-speak-in-saira.md), whose 1.2× line
  height is the cause, and [0204](./0204-season-so-far-becomes-rings.md) /
  [0202](./0202-the-club-page-wears-the-kit.md).

## Context

Saira's metrics are ascent 1.135em and descent 0.439em (natural height
1.574em). On iOS, a line box shorter than that keeps the **whole descent** at
the bottom and trims the deficit from the top (0194).

Every number token sits at 1.2×, so its digits (cap 0.688em, no descenders)
ride high in their box. A number **centred in a chip, a pill or a ring** reads
high:

| Token | Digits above the box's middle |
|---|---|
| `numeral` | 3.7pt |
| `scoreLarge` | 8.6pt |

Loosening the line height to the natural 1.574em would centre the digits, but
it would also grow every row that holds a number.

## Decision

1. **`DisplayMetrics` in the theme** (`cap` 0.688, `descent` 0.439, from the
   TTF) is the one place these numbers live.
2. **`Text` gains an opt-in `opticalCentre`.** For a Saira token, it
   translates the glyphs down by `(descent + cap/2)·size − lineHeight/2`, the
   distance between the digits' midline and the box's. It is a transform, so
   layout is untouched.
   - It is used on the `Score` atom (every size: spine and list chips, the
     board's score beside its rule), the spine's kickoff time, and the matchday
     pills.
   - ⚠ **It is opt-in, not global.** A number baseline-aligned with SF text
     beside it (the countdown's `d h m`) must not move, because a transform
     does not move the layout baseline, and the pair would split.
3. **The ring's number goes through `AnimatedNumber`, whose visible digits are
   a `TextInput`.**
   - **Measured:** a `TextInput` draws Saira about 0.185em higher than a
     `Text` with the same style. At 26pt the model left the digits 4.8pt high,
     and the total 4.5pt further down than intended.
   - That offset is recorded as `DisplayMetrics.inputLift` and folded into the
     ring's `DROP`.
   - The "/ N" total hangs out of the flow, just under the digits' foot, so it
     never lifts them again. The result is 0.2pt off centre, with the total
     about 7pt below.
4. **Key players get portraits.**
   - `PlayerPhoto` (its silhouette fallback is part of the design) takes a new
     `key` size of 44pt (`Size.playerKey`).
   - The shirt number moves from the old disc to a badge on the portrait's
     corner, the XI tokens' idiom (0072), ringed in the card's ground.
   - A player with no squad match gets the silhouette and no badge.
   - `Size.shirtDisc` is deleted.

## Consequences

- Any future Saira number centred in a box should take `opticalCentre`.
  `inputLift` must be re-measured if `AnimatedNumber`'s input styling or a
  ring's number token changes.
- The board score moved 8.6pt down, onto the crests' and rule's line.
