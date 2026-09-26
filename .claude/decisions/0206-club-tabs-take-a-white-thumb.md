# 0206 — The club tabs take a white thumb

- **Date:** 2026-09-25
- **Status:** Accepted
  - `tsc` is clean; lint is unchanged (the 5 errors and 1 warning were already
    there).
  - Simulator-verified on Alavés (Partidos selected) and Barcelona (Resumen
    selected).
- **Decided by:** Ed: *"any idea on how to make this more visible"* about
  Resumen / Partidos / Plantilla. Offered a white thumb, a lime thumb, liquid
  glass, or underline tabs; he chose the **white thumb**.
- **Follows:** [0202](./0202-the-club-page-wears-the-kit.md), which put
  `SegmentedControl` (`quiet`) on the club page.

## Context

The `quiet` tone was built for forms and sheets on plain ground: a 6% white
track, a `raisedAlt` thumb and `textMuted` labels. Over a club's scene (0202)
the track, thumb and scene were all dark, and the selection all but
disappeared.

## Decision

- **`SegmentedControl` gains `tone="contrast"`, used on the club page only:**
  - the accent tone's recessed track (a `recess` well with a hairline)
  - a thumb filled with `text`, the theme's brightest neutral
  - the selected label inked in `background`, the page's own ground
  - unselected labels a step up, at `textSecondary`
- It reads on every club colour, and it **spends no lime**: the page's lime
  stays with the Follow button and the form chips.
- `quiet` is unchanged everywhere else. `accent` (Season stats) is unchanged.

## Alternatives considered

- **Lime thumb** (the existing `accent` tone). The most striking, but it gives
  a page that isn't followed two solid lime elements.
- **Liquid glass.** Native-feeling, but only a little more visible than
  before.
- **Underline tabs.** Lighter, but it reads as navigation rather than a switch,
  and the pill is the kit's.
