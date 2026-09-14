# 0173 — Puerto Rico goes deep on the flag gradient, and the catalogue is fully banded

- **Date:** 2026-09-14
- **Status:** Accepted — simulator-verified on an iPhone 17 Pro against production:
  the Table screen (the asked surface) wears the blue→red gradient crown with the
  ball mark bled right over the 11-row zoneless table; harness passes over 8 banded
  leagues with LPR's inks at white 11.95 / dim 5.57 on the blue top stop.
- **Decided by:** Ed — *"in the Table screen can we support the Puerto Rico league
  please with custom BG support like the other leagues"*. Colour asked and
  answered: **the flag gradient `['#0A417A','#CF1728']`**, chosen over either solid
  because BOTH collide — the mark's red sits ~4° from the Bundesliga's hue and its
  blue ~6° from Honduras' — while the gradient collides with nothing and rides
  [0172](./0172-the-deep-crown-learns-gradients.md)'s machinery shipped the same
  day.
- **Follows:** [0168](./0168-the-ucl-crown-goes-deep.md)/[0170](./0170-honduras-goes-deep-and-the-first-mark-is-traced.md)
  (the banding pattern) and [0171](./0171-the-serie-a-diamond-baked-from-the-wires-own-asset.md)
  (the wire-asset mark cut).

## Decision

1. **`LeagueBand` gains the gradient row** — the LAST competition banded. LPR was
   already a Table tab (the wire serves its standings); banding is what the ask
   amounts to, and it costs zero call-site changes (a normal league, `apiSlug` on
   every screen). `rounds: false` keeps it off Matchdays as ever; Clubs flips too.
2. **`PuertoRicoBall`** (`puerto-rico-ball.tsx`, master `assets/images/PR.svg`):
   the wire's own football-logos.cc SVG, the three COLOURED paths verbatim (two red
   swirls + the blue triangle) with the white backing ellipse dropped. As one white
   silhouette the pieces tile a near-solid disc — the PL shield's solidity, correct
   for this mark. ⚠ The star is a hole BY WINDING (an opposite-wound subpath inside
   the triangle's `d`, open under default `nonzero`) — the starball's
   never-split-the-subpaths rule applies. ⚠ The viewBox passes through VERBATIM:
   the swirl arcs make a sampled crop box unreliable, `PL.svg`'s own rule for
   arc-heavy masters.
3. **Harness §1's unbanded slug is now SYNTHETIC** (`zz-no-band`) — exactly what
   0170's warning demanded when the last real occupant left. Not a formality: an
   unknown slug falling back to the brand crown with dark ink is the behaviour
   every FUTURE league depends on in the gap before its band row lands, and this
   loop is that contract's only proof. The gallery's brand-proof column moved to
   the same synthetic slug (`⚠ unbanded`).

## Consequences

- **Every competition in the catalogue wears a deep crown, and every crown carries
  its mark** — eight ramps, seven marks (segunda shares LaLiga's crown,
  unreachable). ADR 0031's "text branch" note and 0159's "no artwork" era are
  historical for the crown; a new league's arrival checklist is now: catalogue row,
  band hex (or gradient) from Ed, mark cut, `CrownArt.height` entry.
- The brand crown on a LEAGUE surface no longer occurs in production — it survives
  on Today/News/onboarding (`null`) and for unknown slugs, both harness-pinned.
- Provenance for the App Store check: EIGHT marks — football-logos.cc ×3 (PL,
  Serie A, LPR — the latter two via our own bucket), Wikimedia Commons ×2,
  en.wikipedia ×1, Ed-supplied ×1 (Honduras), plus the UCL lockup already bundled
  by 0133.

## Alternatives considered

- **Solid red or solid blue** — offered with the collision numbers; Ed took the
  gradient.
- **Waiting to band it** — the ask was the banding; the "Table support" LPR needed
  was already live.
