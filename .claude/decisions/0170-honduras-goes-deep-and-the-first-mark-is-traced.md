# 0170 — Honduras goes deep, and the first mark is TRACED from a raster

- **Date:** 2026-09-14
- **Status:** Accepted — simulator-verified on an iPhone 17 Pro against production:
  Matchdays and Table on the Honduras tab (deep navy, white ink, colibrí bled right,
  the zones-less table intact under a deep crown), Today still brand. Read-path
  verification (0166's limit) — and mid-check someone picked a league in the open
  panel on the device, which incidentally exercised the WRITE path too: the pick
  landed and survived a relaunch.
- **Decided by:** Ed — *"lets do the Honduras league with the icon hondurasLeague.png
  and color - #012D76"*. He dropped `assets/images/hondurasLeague.png` (1504×1312)
  the same night — the PL.svg move (0165), in raster form.
- **Follows:** [0168](./0168-the-ucl-crown-goes-deep.md)'s banding pattern and
  [0159](./0159-liga-hondubet-joins-the-catalogue.md), whose "no artwork, no
  LeagueBand" state this partially retires.

## Context

Honduras was one of the two remaining unbanded competitions (brand crown, dark ink).
Unlike the UCL it is a REAL league — `apiSlug === 'liga-nacional-apertura'` is also
its route slug — so banding it costs **zero call-site changes**: all three screens
already pass `league.apiSlug` and flipped deep on the commit that added the row.

The mark had no vector anywhere: the wire serves a low-res PNG of the colibrí (which
the banner pill already draws), cronogol bundles rasters, and no official vector is
published. Ed's PNG is a clean high-res copy of the same mark.

## Decision

1. **`LeagueBand` gains `'liga-nacional-apertura': { solid: '#012D76' }`** — Ed's
   hex; the wire `accentColor` is null and 0159 recorded no brand colour. Today's
   finished-section header takes it too (0168's shared-row pattern, already chosen).
   ⚠ **Same HUE as Serie A (≈217°)** — after `CrownDeepSat` the two ramps differ by
   saturation alone (85 vs 62; top stops `#082c68` vs `#15345b`), and the harness §5
   now pins `notDeepEqual(serie-a, liga-nacional-apertura)` so the clamp can never
   silently collapse them. Ink: white 13.37 / dim 6.03 with art composited.
2. **The mark is TRACED** (`HondurasColibri`, master `assets/images/HN.svg`): the
   PNG's alpha channel thresholded at 128 (the alpha is effectively binary —
   verified, not assumed), boundary edges extracted by shared-edge cancellation,
   simplified by Ramer-Douglas-Peucker at ε 1.8px on the full-res source, specks
   dropped. Parameters live in the master's comment so it can be regenerated.
   ⚠ **Four disjoint islands, NO nesting, no `fillRule`** — the ball's interior is
   genuinely transparent, so the C-ring and star are islands, not counters. An
   earlier read of a test render guessed "holes"; the loop table (bboxes +
   signed areas) said otherwise — render the trace AND read its topology before
   wiring, the lesson 0169's winding note already half-taught.
3. **Harness §1 is down to `lpr-pro-clausura` alone**, with a warning that the loop
   must never go empty: Puerto Rico is the last competition proving the
   unbanded-⇒-brand-⇒-dark-ink coupling, and if it is ever banded a synthetic
   unbanded slug must take its place. The gallery's brand-proof column moved to
   `⚠ puerto rico` for the same reason.

## Consequences

- The catalogue is one row from fully banded; the brand-crown path on a league
  screen now exists only for Puerto Rico. The harness's synthetic-slug note is the
  guard against losing the case entirely.
- A raster-only league now has a documented path to a mark: trace parameters in the
  master, regenerable, ~1.4KB of path for a 1.9MB source.
- The 1.9MB `hondurasLeague.png` stays in `assets/images` as the design source and
  ships nowhere — nothing `require`s it and there is no `assetBundlePatterns`
  (verified; same status as every SVG master and the orphaned `ucl.png`).
- Provenance check before the App Store: SEVEN marks, this one Ed-supplied.

## Alternatives considered

- **`FadeOutImage` with the PNG** — the raster route every art ADR has rejected:
  it fights the aspect, and the fade-is-the-fill contract is an SVG gradient.
- **Waiting for an official vector** — none exists to wait for; the league's own
  materials are raster.
