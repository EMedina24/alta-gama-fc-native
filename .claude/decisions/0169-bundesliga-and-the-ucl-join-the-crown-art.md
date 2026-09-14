# 0169 — The Bundesliga kicker and the UCL starball join the crown art

- **Date:** 2026-09-14
- **Status:** Accepted — simulator-verified on an iPhone 17 Pro against production:
  the kicker on Matchdays' Bundesliga crown, the starball on Matchdays and Table on
  the cup tab (its star counters render OPEN under the default winding on device),
  and the `?only=league-tint` gallery columns.
- **Decided by:** Ed — same ask as [0168](./0168-the-ucl-crown-goes-deep.md), plus
  two asked cuts: **kicker silhouette alone** for the Bundesliga (not the badge
  block) and **starball alone** for the UCL (not the bundled lockup — its wordmark
  is ~1/5 of its height and the banner pill beside the art already says the name).
- **Follows:** [0167](./0167-laliga-joins-the-crown-art.md)'s "a third league's mark
  is now a mechanical addition" — this entry is that mechanism run twice, with two
  new per-master wrinkles worth recording.

## Decision

Two new atoms on the established pattern (drawn not loaded, fade IS the fill,
`useId`, `accessible` false, exported ratio; ADR 0165/0167):

1. **`UclStarball`** (`ucl-starball.tsx`, master `assets/images/UCL.svg`) — the
   text-free starball of Wikimedia Commons' `UEFA Champions League logo no text.svg`,
   viewBox cropped to the glyph's sampled bbox (`2.36 2.47 27.28 27.05`, ratio ≈ 1.01).
   ⚠⚠ **One `d`, six subpaths, never split across `Path` elements**: the star panes
   are opposite-wound counters, open only under one shared `nonzero` fill — the PL
   crest's subtlety with the OPPOSITE fix (its counters need `evenodd`). Winding is
   per-master; check it per-master.
2. **`BundesligaKicker`** (`bundesliga-kicker.tsx`, master `assets/images/BL.svg`) —
   path 2 of 3 of Wikipedia's `Bundesliga logo (2017).svg` (the player-and-ball
   figure; red box and BUNDESLIGA wordmark dropped). ⚠ The source group carries
   `translate(-253.32 -1660.1) scale(2.1856)`; it is uniform, so it is **dodged, not
   applied** — the viewBox is the figure's sampled bbox in the path's own coordinate
   space (`118.04 762.01 30.07 22.66`) and the data passes through untouched.
   The widest mark in the catalogue (ratio ≈ 1.33): its `CrownArt.height` of **0.36**
   is what keeps its visible fragment near the others', and the ball sits top-right
   so the screen-edge bleed cuts it first and leaves the player readable.
3. `ART` and the `CrownArt` union take both slugs; `CrownArt.height` gains
   `bundesliga: 0.36` and `'champions-league': 0.45` (device-judged, like every
   number in that slot). The scaffold's growing ternary became an `ART_MARK`
   component map — all four atoms share the `{height, alpha}` contract.
4. Harness §6 is now driven off an `ART_SLUGS` list: a positive per-slug assertion,
   and the null sweep filters `entried` against the same list — ADR 0167's "art
   belongs to exactly the slugs in `ART`" made literal. The ink-with-art-composited
   assertions covered both new ramps for free.

## Consequences

- All four European tabs now carry art; **Serie A is the one banded league
  without a mark**, and the mechanism is unchanged if it gets one.
- The pre-App-Store provenance check (ADR 0165) now covers FOUR bundled marks:
  `football-logos.cc` (PL), Wikimedia Commons (LaLiga, UCL), en.wikipedia
  (Bundesliga).
- Two masters now document a winding/fill-rule note; anyone adding a fifth mark
  should render the extracted glyph over a dark ground BEFORE wiring it, exactly as
  these were.

## Alternatives considered

- **The bundled UCL lockup** (`competition-mark.tsx`) as the watermark — it is one
  flat path and would have worked mechanically, but its wordmark repeats the pill
  and its box is the lockup's, not the ball's. A different asset for a different
  job, both directions (ADR 0133 §1).
- **The full Bundesliga badge with the figure knocked out** — offered to Ed,
  declined; a solid rounded block is wallpaper-weight nowhere.
