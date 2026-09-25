# 0196 — LimeGlow replaces the Mesh on stack screens

- **Date:** 2026-09-25
- **Status:** Partly superseded — the club page now wears the club scene of [0202](./0202-the-club-page-wears-the-kit.md). Was: Accepted
- **Decided by:** Ed, via the Medina adoption plan
  ([0193](./0193-medina-digital-becomes-the-design-system.md), phase 4).
- **Amends:** [0087](./0087-crown-aurora-shell-adopted.md), which said every
  screen draws the three-pool aurora `Mesh`.

## Context

The Medina kit's screen ground is **one** lime pool at the top right on the
graphite `background`: its `LimeGlow` atom. The kit meant it to replace
`MeshGround` on Medina screens.

`MeshGround` has two jobs here:

- **Tab screens.** Through `screen-scaffold`, it draws the league-hued pools
  under the crown. This is the reader's chosen background
  ([0164](./0164-the-crown-and-the-page-take-the-league-hue.md),
  [0175](./0175-the-board-wears-the-readers-background.md)).
- **Plain stack screens.** Eight screens call it bare, for the brand `Mesh`:
  - News and Saved news
  - the club page, season stats and Starting XI
  - the three onboarding steps

## Decision

1. **A `LimeGlow` token** (one pool: `cx` 0.88, `cy` 0, `rx` 0.7, `ry` 0.38,
   alpha 0.11, fade 0.7, in accent lime) and a **`LimeGlow` atom** that renders
   `MeshGround` with it. There is one pool renderer, so the `stopOpacity` rule
   (trap 42) and the `useId` gradient ids come for free.
2. **The eight bare `<MeshGround />` calls (11 sites) become `<LimeGlow />`.**
3. **The tab screens keep their league mesh.** `Mesh` stays as the brand
   default there, and `MeshTile` stays for the widgets.
4. **The glow is ambient.** It does not count as a screen's "one lime
   element".

## Consequences

- Stack screens lose the teal and blue-teal pools, and the page reads graphite
  with a single lime light. That is the kit's look.
- The tabs are unchanged, so moving from a tab into a club page now changes
  ground as well as content. That is intended: the tab ground belongs to the
  reader, and the stack ground belongs to the brand.
- The kit's own atom was an SVG copy of the same radial. We did not port it,
  to avoid a second renderer.
