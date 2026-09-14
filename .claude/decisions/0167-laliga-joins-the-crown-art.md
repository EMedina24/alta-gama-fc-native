# 0167 — LaLiga joins the crown art, and the mark's height goes per-league

- **Date:** 2026-09-14
- **Status:** Accepted — simulator-verified on an iPhone 17 Pro against production:
  the glyph on the real Matchdays and Table screens with `la-liga` stored, and the
  `?only=league-tint` gallery column beside the PL's. ⚠ Read-path verification only
  (the stored league was edited in the container, 0166's documented limit) — but the
  write path is untouched by this change.
- **Decided by:** Ed — *"we recently updated the matchday and table screen to include
  the league logo in the background. Can we do something similar for LaLiga please."*

## Context

ADR 0165 shipped the deep crown with the Premier League crest as its only background
art, and framed the absence everywhere else as a known state, not a gap: `ART` is a
one-entry map, and the harness pinned `art: null` for every other competition. Ed asked
for the same treatment on LaLiga.

Two things had to be found rather than decided:

**A vector.** The wire serves LaLiga an `icon` and a `wordmark` through `logoUrls` —
both PNG, both sized for a chip; no silhouette-grade vector anywhere in the ecosystem
(cronogol bundles only raster lockups). Wikimedia Commons'
`LaLiga 2023 Vertical Logo.svg` carries the real geometry — ⚠ several sibling files
there (`LaLiga logo (2023).svg` among them) are **rasters wrapped in an SVG shell**, an
`<image>` tag and nothing else, so the file was checked for actual `<path>` data before
use. The glyph's two subpaths were extracted, the LALIGA wordmark dropped, and the crop
box computed by sampling the curves: `145.23 0 830.35 772.57`.

**A shape problem.** The PL crest is portrait (ratio ≈ 0.78); the LaLiga glyph is
landscape (≈ 1.07). At the crest's shared `CrownArt.height` of 0.55 the glyph would
draw ~40 % wider — 255pt against the crest's 186 — and its visible fragment after the
44pt bleed would cover more than half a 390pt screen: the "second subject crowding the
title" that 0165's first cut already shipped once.

## Decision

1. **New atom `LaLigaGlyph`** (`laliga-glyph.tsx`), on `PremierCrest`'s exact pattern:
   drawn not loaded, master at `assets/images/LL.svg` that nothing `require`s, the fade
   IS the fill, `useId` for the gradient, `accessible` false. Two deliberate departures
   from the Commons path data, present in the master too so code and master stay
   byte-identical: the second subpath's relative start (`m375.4 0`, legal only after
   the first subpath's `Z`) is made absolute (`M757.29 0`) so the paths render
   independently, and its arc of radius **689654.91** — straight to within 0.02 units
   over its 347-unit chord — becomes the line it draws, rather than betting a native
   arc parser's float precision on a radius six orders larger than the canvas.
   ⚠ No `fillRule`: unlike the crown-and-lion these strokes have no counters, so the
   default `nonzero` is correct and `evenodd` would be a lie about the geometry.

2. **`CrownArt.height` becomes a per-mark map** (`{ 'premier-league': 0.55, laliga: 0.42 }`)
   — the shape problem above is why one number cannot serve both. `alpha` stays ONE
   value for every mark, deliberately: the harness rates every banded ramp's inks with
   that alpha composited under them, and a per-mark alpha would need a per-mark
   assertion to keep meaning anything. 0.42 lands the glyph's visible fragment at
   roughly the crest's width; device-judged like every number in this slot.

3. **`ART` gains `laliga`**, the type widens to `'premier-league' | 'laliga'`, and the
   scaffold and gallery branch on the value. ⚠ **`segunda` shares LaLiga's RAMP
   (0062's shared band hex) but not its art** — it is not in `LEAGUES`, no screen ever
   wears its crown, and the harness now states explicitly that art is keyed by slug,
   never inherited through colour.

## Consequences

- The harness's §6 changes meaning: from "the crest is the PL's alone" to "art belongs
  to exactly the slugs in `ART`" — the null assertion still sweeps every other banded
  league, the UCL and the brand.
- A third league's mark is now a mechanical addition: atom + master + `ART` entry +
  `CrownArt.height` entry + scaffold branch + gallery branch, and the ink assertions
  come free. The Bundesliga and Serie A remain the natural candidates.
- Provenance: Wikimedia Commons, like the PL's `football-logos.cc` — ⚠ 0165's
  pre-App-Store provenance check now covers TWO bundled marks.
- `CrownArt.height` is no longer a scalar; anything new reading it must know which
  mark it is sizing.

## Alternatives considered

- **The wire's `icon` PNG via `FadeOutImage`** — 0165 already rejected the raster
  route for the PL: a chip-sized asset upscaled to ~240pt, a square `size` fighting the
  mark's aspect, and a mask where a gradient fill does the job in one `Svg`.
- **One shared height with the glyph's own bleed constant** — `ART_DROP`/`ART_OFF`
  are the CROWN's geometry, shared by design; forking them per mark spreads one
  decision across two files. The mark's own height is the lever that exists for this.
- **Art for `segunda` too** — it shares the glyph in the real world (LALIGA
  HYPERMOTION), but no screen can ever show its crown; an entry would be dead code
  asserting nothing.
