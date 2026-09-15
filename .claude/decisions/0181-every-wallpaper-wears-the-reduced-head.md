# 0181 — Every wallpaper wears the reduced head, league marks included

- **Date:** 2026-09-14
- **Status:** Accepted — simulator-verified (LaLiga wallpaper: day line only,
  glyph head-left, card dropped; club path regression-checked by eye).
- **Decided by:** Ed — reporting the LaLiga pick as a REGRESSION (*"I swapped
  wallpapers and the position of the crests in the BG and the word 'Board'
  reverted"*): 0179/0180's head treatment had been scoped to CLUB picks, and
  to the reader that scope line reads as a bug, not a design.
- **Amends:** [0180](./0180-the-watermark-moves-into-the-heads-place.md) —
  scope only; the geometry, inks and harness premise stand.

## Decision

On the BOARD, a league wallpaper now builds the same `crownOverride` a club
one does: the league's own drawn mark (`ART_MARK`, now exported from the
scaffold) at `CrownArt`'s size and alpha, anchored `headLeft`; the day-line
head; `CrownClubHead.padBottom`'s card drop. The board no longer passes
`tintLeague` at all — every wallpaper travels as an override, and the brand
default keeps the full bright-crown title. The LEAGUE SCREENS (Matchdays,
Table, Clubs) are untouched: their `tintLeague` path, right-bled mark and
full title are their own design, not the board's.

Ink note: the day line sits on the league mark at `CrownArt.alpha` 0.095 —
inside section 4's existing composite proof, no harness change.
