# 0179 — The crest takes the head: the club mark replaces the Board's title

- **Date:** 2026-09-14
- **Status:** Accepted — simulator-verified (RM crest at top-left, full
  colour, EDIT/avatar row unmoved, watermark gone; cold-relaunch clean).
- **Decided by:** Ed — *"let's try moving the bg crests up to the top left
  replacing the word 'Board' and the day of the week."*
- **Amended by [0180](./0180-the-watermark-moves-into-the-heads-place.md)**
  — the solid 64pt mark lasted one look: Ed wanted the WATERMARK style in
  this position. `headLead`, the title's retirement and the a11y contract
  survive; 0177/0178's tuning is back in force.
- **Supersedes:** [0177](./0177-the-club-crest-steps-forward.md) and the
  watermark half of [0178](./0178-the-watermark-asks-for-the-big-crest.md) —
  the bled right-edge club watermark retires, and the alpha/band tuning goes
  with it. 0178's **`hero` crest ask survives** as the head's source.
- **Amends:** [0175](./0175-the-board-wears-the-readers-background.md) — the
  club background's art moves from the ramp's right edge into the HEAD.

## Context

Two rounds of tuning (0177 alpha, 0178 source/bands) still left the club
watermark fighting the liquid-glass card that covers most of its box. Ed's
call cuts the knot: with a club background on, the crest becomes the
screen's identity mark — top-left, full colour, where "MONDAY / Board"
stood — the club-app read, not a ghost behind glass.

## Decision

1. **`Crown` gains `headLead?: ReactNode`** — replaces the whole
   eyebrow/title/subtitle/metaLine stack; `meta` and `accessory` keep their
   row; the head gate becomes `title || headLead`. ⚠ The caller owns the
   node's accessibility — the stack it replaces carried the screen's
   heading, so the node must speak (the board labels it with the club's
   name, role `header`).
2. **`ScreenScaffold.crownOverride` gains `head?: ReactNode`**, threaded to
   `Crown.headLead` — head, art and theme travel together, the "tone ships
   with the stops" rule unchanged.
3. **The board renders the crest as the head** — `Crest` atom (monogram
   fallback for artless clubs, for free) at new **`CrownClubHead.size`
   (64pt** — the eyebrow+title stack's height, so the accessory row does
   not move), source still `crestSrc(…, 'hero')`. `crownOverride.art` is no
   longer passed: the watermark moved, it did not double.
4. **`CrownClubArt` deletes** (alpha/height/fades/bands were all
   watermark-only). The harness's club section rates BOTH inks on the BARE
   band again — nothing composites onto a club ramp any more — with a note:
   put translucent art back on a club crown and the composite tier comes
   back FIRST (the quiet ink has no headroom, 4.53:1 bare at the worst hue).
5. Default and league backgrounds are untouched: "MONDAY / Board" stays,
   league marks keep their bled right edge and `CrownArt` proof.

## Rejected

- **A translucent crest at top-left** — replacing a title with a ghost reads
  as a missing header; the head slot demands a solid mark.
- **Keeping the watermark alongside the head** — the same crest twice on one
  ramp is a pattern, not an identity.
