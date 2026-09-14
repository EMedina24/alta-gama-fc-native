# 0171 — The Serie A diamond, baked from the wire's own asset

- **Date:** 2026-09-14
- **Status:** Accepted — simulator-verified on an iPhone 17 Pro against production:
  the diamond on Matchdays' Serie A crown, monogram carved, on a navy visibly
  distinct from Honduras' (0170's same-hue neighbour).
- **Decided by:** Ed — the "and Serie A please" half of 0170's ask.
- **Follows:** [0167](./0167-laliga-joins-the-crown-art.md)/[0169](./0169-bundesliga-and-the-ucl-join-the-crown-art.md) —
  the last banded league without a mark takes one, and the catalogue's art set is
  complete.

## Decision

**`SerieADiamond`** (`serie-a-diamond.tsx`, master `assets/images/SA.svg`), cut from
the wire's OWN Serie A asset (`GET /cronogol/leagues` → `logoUrls.primary`, a
football-logos.cc SVG — the same upstream as the PL crest, this time fetched from
our own storage bucket):

1. **The cut is the lockup's two GRADIENT-filled paths only** — the diamond's bright
   body, whose outline already carves the monogram figure, and the inner bottom
   triangle. The SERIE A wordmark, the tricolor bar and the NAVY facet paths are
   dropped: on a dark crown, **white-as-bright is how the mark reads** — the navy
   parts of the logo are exactly where the crown should show through, so painting
   only the bright geometry reproduces the mark's dark-ground reading with one fill.
2. ⚠ **The coordinates are BAKED, not verbatim — the first master where that was
   forced.** Both paths share `matrix(.44962 0 0 -.44962 -1596.905 937.635)`; the
   NEGATIVE y-scale means the Bundesliga trick (dodge the transform by cropping the
   viewBox in path space, 0169) renders the mark upside down here. Both paths are
   purely polygonal (`m/l/h/z`), so applying the affine to every vertex is exact —
   nothing re-measured, only re-based. Baked box `9.12 4.55 45.30 52.54`,
   ratio ≈ 0.862; `CrownArt.height` 0.5.
3. Two disjoint shapes, no counters, no `fillRule`.

## Consequences

- **Every banded competition now carries art** (seven ramps, six marks — segunda
  shares LaLiga's crown and is unreachable). A new league arriving without a hex and
  a mark will now read as the odd one out; 0159's "text branch is fine" era is over
  for the crown, and the next catalogue ADR should budget for both.
- The masters now document three transform postures: verbatim (PL/LaLiga/UCL),
  dodged (Bundesliga), baked (Serie A) — pick by whether the source transform is
  absent, uniform-positive, or flipped.
- Provenance for the App Store check: the asset is served by our own backend and
  originates at football-logos.cc — the PL crest's answer covers this mark too.

## Alternatives considered

- **Union silhouette of all diamond pieces** — a featureless kite; the monogram is
  colour contrast in the source, not alpha, so the union erases the identity.
- **Navy-pieces-only silhouette** — the inverse reading (figure + facets, no body);
  tried on paper, but it inverts how the real mark reads on dark and leaves the
  diamond without its outline.
