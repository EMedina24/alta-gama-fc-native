# 0075 — The export card reserves the caption's height under the pitch, so the goalkeeper's name is never clipped

- **Date:** 2026-08-30
- **Status:** Accepted — verified on the simulator (1:1 and 4:5 previews, 2026-08-30). ⚠ Known: 1:1 was already dense (row spacing < ring + caption) and the inset tightens it a little more — a smaller ring on 1:1 is a separate call.
- **Decided by:** Ed Medina

## Context
On the 1:1 and 4:5 cards the goalkeeper's name was cut off at the pitch's
bottom edge. `PitchSlots` projected `slot.y` (89 % for the GK) onto the full
pitch height, and a token's ring (132) plus caption (~50) hang below that
centre: 659 on a 610-tall 1:1 pitch, 899 on an 880-tall 4:5 pitch. The pitch
clips its children. 9:16 (1450) had room, which is why it looked fine there.

## Decision
1. **`PitchSlots` takes `insetBottom`** (points, default 0) and projects y
   onto `height − insetBottom`. The whole formation compresses upward evenly;
   the tables' relative spacing and `slotCentre`'s contract are untouched, and
   the board passes nothing.
2. **`CARD.captionReserve = 120`**: `ring / 2` (66) + `nameGap` (10) + the
   tallest caption (~44). `LineupCard` passes it scaled. GK bottom now lands
   at 552 on 1:1 and 792 on 4:5; the highest slot (ST, 15 %) keeps ~7 card-px
   above the top edge on 1:1.

## Consequences
- Every card size shifts its formation up slightly; 9:16 by an imperceptible
  amount. The board is unchanged.
- ⚠ Any future caption that grows taller than 44 card-px must raise
  `captionReserve` — the number is measured, not derived.

## Alternatives considered
- **Per-formation table nudges** — eleven tables to re-measure, and the board
  shares them.
- **Letting the caption overflow the pitch** — the pitch's rounded corners
  need `overflow: hidden`.
