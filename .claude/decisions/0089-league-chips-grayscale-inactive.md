# 0089 — League chips: 36pt mark-hugging chips, grayscale when inactive, near-black when selected

- **Date:** 2026-09-01
- **Status:** Accepted — verified on the simulator (Matchdays/Table crowns, Clubs ground row)
- **Decided by:** Ed Medina, from `handoff_new-paint/` (chip rows at mockup lines 326–328, 1631–1710)
- **Supersedes:** [0031](./0031-league-filter-tiles-are-artwork-only.md)'s tile GEOMETRY and idle-opacity rule — its artwork-only rule and labelled no-artwork fallback survive

## Context

The 80×56 fixed tiles (0031) predate the crown. The mock draws 36pt
mark-hugging chips in two palettes — one ON the crown's bright band
(Matchdays, Table), one on the body ground (Clubs) — with inactive marks
`grayscale(1) opacity(.78)` and a selected chip inverting to a near-black
plate whose mark returns to full colour: the system's one double inversion.

## Decision

1. **`LeagueSwitch` gains `tone: 'crown' | 'ground'`** (default ground).
   Crown: idle = `onCrownFill` + `onCrownLine` at chip-opacity .72, selected =
   `crownChipOn` plate + `crownChipOnLine`, label fallback ink `crownChipInk`.
   Ground: idle = transparent + `glassLine`, selected = `segThumb` +
   `accentRing`. Radii: `crownControl` (11) on the crown, `thumb` (13) on the
   ground. Mark box `leagueChipMarkW/H` 44×22.
2. **True grayscale with zero new dependencies**: inactive BITMAP marks render
   through `react-native-svg/filter-image`'s `FilterImage` with
   `feColorMatrix saturate 0` — the native `RNSVGFeColorMatrix` already ships
   in the installed build. Each `FilterImage` mints its own filter id (no
   trap-40 collision).
3. **⚠ The SVG-mark carve-out, found on the simulator**: `FilterImage` draws
   through react-native-svg's `Image`, which renders bitmaps ONLY — Serie A's
   `primary` mark is an SVG and came out as an EMPTY chip. An SVG source
   (`isSvgUrl`) keeps `expo-image` and takes the opacity-only approximation
   (.45) instead. A recorded divergence, not a bug: colour at .45 on a dimmed
   chip reads muted at arm's length, and an invisible league is worse than an
   unsaturated one.

## Consequences

- `leagueTileW/H`, `leagueMarkW/H` lost their last consumer — P6 deletes them
  if still orphaned.
- The four chips fit the gutter without scrolling at 44×22 marks; the row
  still scrolls if a fifth league arrives.
- If the upstream ever serves Serie A a bitmap `icon` cut, the carve-out
  self-heals — the check is on the URL, not the league.
