# 0096 — The NEXT UP card goes liquid glass; the club pair drops to a whisper

- **Date:** 2026-09-01
- **Status:** Accepted — verified on the simulator (washed pairing on the crown; the no-wash and TBD variants via gallery previews only)
- **Decided by:** Ed Medina, live on the simulator ("more liquid glass, remove or reduce the gradients")
- **Amends:** [0095](./0095-next-up-joins-the-crown.md)'s card surface · [0068](./0068-club-colour-wash.md)'s wash on THIS card (the taming rule and the club page's washes are untouched)
- **Extends:** [0090](./0090-clubs-bubbles-liquid-glass-and-trays.md)'s glass treatment from the bubbles to a card

## Context

In the crown, the washed NEXT UP card was the one opaque slab on the gradient:
`#15171a` base (the wash needed it) plus the full-alpha club pair. Everything
around it had gone translucent.

## Decision

1. **The card body is 0090's liquid glass at card size**: a `GlassView`
   (`glassEffectStyle: 'clear'`) where `isLiquidGlassAvailable()`, a flat
   `glassFill` where not — module-scope gate, shared overlays (top sheen, lit
   top edge). The crown's gradient now shows through the card.
2. **A `recess` scrim sits between the glass and the ink** — the refracted
   crown alone left the card too bright to ground white text ("a bit darker"):
   the translucent black is what sets the card a step below the surface it
   refracts, on any part of the gradient.
3. **The club pair survives as a WHISPER** (`ClubWash2.edgeOnGlass` .10 /
   `midOnGlass` .02): a translucent tint over a translucent shell
   double-blends with what is behind it, so the full alphas and the opaque
   base they required are both gone. The dead-transparent middle stays.
4. **One chrome set for both variants**: the lime ring and the accent
   `VersusBadge` return on the washed card — 0068 swapped them for white ON a
   wash, and a whisper is not a wash to defer to. `washInk` leaves with it.
5. **Faint inks step up to `textSecondary` inside the card** — on frosted
   glass over the crown's greens, `textFaint` vanished, and two of those lines
   are honesty lines ("EDT · YOUR TIME", ADR 0034; the TBD note).

## Consequences

- `next-up-card.tsx` no longer imports the opaque `card` token; the screen's
  `pairWash` resolution is unchanged (the whisper still needs the tamed pair).
- ⚠ The no-wash variant and large Dynamic Type on the glass are unseen outside
  the gallery; same device-pass list as 0094/0095.
