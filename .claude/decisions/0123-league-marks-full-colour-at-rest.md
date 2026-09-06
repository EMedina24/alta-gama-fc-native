# 0123 — League marks are full colour at rest

- **Date:** 2026-09-06
- **Status:** Accepted
- **Decided by:** Ed ("Lets make the league icons fill color, it seems they
  default to white when they're not selected", on the glass rail)
- **Supersedes:** [0089](./0089-league-chips-grayscale-inactive.md)'s
  grayscale-inactive treatment and its double inversion — its mark-hugging
  geometry and [0031](./0031-league-filter-tiles-are-artwork-only.md)'s
  artwork-only rule stand

## Decision

Every league mark renders **full colour all the time** — one plain `Image`
per chip. Idle chips recede by the 0.72 dim alone; selection is the plate
plus the chip brightening in `Motion.quick`.

0089's grayscale was designed for chips floating directly ON the crown's
bright band, where colour needed earning. The rail (0117–0120) changed the
ground: on dark glass a desaturated mark doesn't read as "off", it reads as
WHITE — the Premier League lion and Bundesliga wordmark looked like
placeholder glyphs beside the coloured selection.

Deleted wholesale, because each existed only to serve desaturation:

- the `FilterImage` grayscale layer (`feColorMatrix saturate 0`) and
  `IDLE_MARK_OPACITY`;
- the stacked two-layer mark with its `Motion.quick` opacity crossfade
  (0117's "light-up" — the chip-level dim ramp keeps the timing);
- the whole SVG fork (`isSvgUrl`, `SVG_IDLE_OPACITY`) — the bitmap-only
  `FilterImage` limitation no longer matters when nothing is filtered, so
  Serie A's SVG divergence closes for free.

## Consequences

- The repo no longer imports `react-native-svg/filter-image` anywhere; the
  trap-40 filter-id caution goes dormant with it.
- Idle hierarchy now rests entirely on the 0.72 chip dim — if idle marks
  shout on device, that constant is the one dial (device-judged).
- `LeaguePills` (onboarding) never had the grayscale treatment and is
  untouched.
