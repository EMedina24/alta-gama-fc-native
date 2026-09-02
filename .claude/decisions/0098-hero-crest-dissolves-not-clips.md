# 0098 — The hero's wallpaper crest DISSOLVES instead of clipping: a banded fade, not a mask

- **Date:** 2026-09-01
- **Status:** Accepted — verified on the simulator (Barcelona, a raster crest; Liverpool, an `.svg` crest)
- **Decided by:** Ed Medina (flagged the cut crest); treatment chosen and built same day
- **Amends:** [0091](./0091-club-page-hero-and-trays.md) — the crest bleed's EDGE only; geometry, 6% alpha and the clip itself all stand

## Context

0091's hero bleeds the club's crest off the bottom-left at 6% and clips it
with the hero's `overflow: 'hidden'`. The mock does exactly the same
(238px at `-72/-64`, opacity .1, `overflow:hidden`) — but the hero's wash
fades to NOTHING by three-quarters of its height, so the clip line at the
hero's foot has no visible container to explain it. The crest just stopped
in a straight horizontal line mid-artwork, floating in open space, and Ed
read it as a rendering fault. He was right to: a clip reads as intentional
only when it coincides with an edge the eye can see.

⚠ The NEXT UP card's opponent crest is clipped the same way and is NOT
touched: its container is a visible rounded card with a border and a colour
wash, which is the standard watermark-in-card treatment. Same mechanism,
different verdict, and the difference is the visible edge.

## Decision

The wallpaper crest dissolves to zero just above the hero's clip line — the
CSS `mask-image: linear-gradient(...)` treatment — via a new
`atoms/fade-out-image.tsx`. React Native has no view alpha masks, so the
atom draws the image in horizontal BANDS: one solid window, then six
stepping opacity down a half-cosine, every band a clipped viewport onto the
SAME expo-image source (decoded and cached once). At watermark alphas the
per-band step is ≤1.5% — far below perception — so it reads as a true
gradient.

- The fade's endpoint is DERIVED from the bleed offset
  (`BLEED_CLIP = (bigCrestBleed − BLEED_OFF) / bigCrestBleed`), so the fade
  and the clip cannot drift apart — trap 22's one-setting-in-two-places
  lesson, pre-empted.
- The LEFT edge still hard-clips, at the physical screen edge, where a cut
  always reads as intentional.
- This is a deliberate divergence from the design pack, which hard-clips.

## Why not the obvious alternatives

- **Let it overflow** (drop `overflow: 'hidden'`): the crest would run 96pt
  past the hero's foot underneath the standings strip and show through its
  translucent glass fill as a ghost. Trades a clean-but-jarring line for a
  smudge.
- **A react-native-svg `<Mask>`** — the "right" primitive, and wrong here:
  rn-svg's `<Image>` decodes through the native raster pipeline, and
  **Bundesliga and Premier League crests are `.svg` with no raster
  anywhere** (probed production 2026-09-01: `logoUrls` is `['svg']` alone
  and `logoUrl` is itself the `.svg`). The masked crest would render blank
  for whole leagues, silently — trap 12's shape, again. expo-image speaks
  svg; the banded fade keeps it.
- **`@react-native-masked-view/masked-view`** — masks any view, but it is a
  new NATIVE module: the installed dev build cannot load it, so the fix
  could not be seen the day it was asked for, and it is a heavy spend on a
  6%-alpha watermark. Revisit if a second, higher-alpha mask ever appears.

## Consequences

- The hero has no unexplained edge anywhere: dissolve at the foot, screen
  edge on the left, and the wash was always a fade.
- ⚠ `FadeOutImage` is only honest at LOW alphas. A full-opacity photograph
  through six 1.5%-steps would band visibly; the atom's docblock says so.
  If a high-alpha fade is ever needed, that is the masked-view revisit.
- Seven `Image` instances of one URI per hero — one decode, one cache
  entry, seven draws. Cheap, but it is why `bands` defaults to 6 and not 60.
- Band boundaries round EDGES, not heights, so adjacent windows share their
  boundary pixel; rounding heights independently repeats a hairline of the
  image between bands.

## Alternatives considered

- **Re-anchoring the crest so its own silhouette ends at the hero's foot** —
  no new drawing code, but the artwork rises into the title zone and drifts
  further from the mock's composition than a changed edge does.
- **Fading with an overlay gradient painted over the crest** — impossible:
  the ground behind is the mesh, not a flat colour, so there is nothing an
  opaque overlay could match.
