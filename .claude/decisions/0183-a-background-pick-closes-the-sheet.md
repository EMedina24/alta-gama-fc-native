# 0183 — A background pick closes the sheet

- **Date:** 2026-09-14
- **Status:** Accepted — `tsc`/lint clean; simulator-verified on four picks
  (club, default, club, club): each committed, dismissed the sheet itself
  and revealed the recoloured board. The Close/`onClose` path is untouched
  code and was not re-exercised by hand.
- **Decided by:** Ed — *"After selecting a BG the modal/pop-up should
  close"*.
- **Amends:** [0175](./0175-the-board-wears-the-readers-background.md) —
  the picker's stay-open clause only; detent, layout, live recolour and
  the `bdBg` machinery stand.

## Decision

The Board background picker dismisses itself on a pick: `onPick` still
haptics and writes `setBoardBackground`, then calls `router.back()` — the
confirm-style sheet pattern (`alerts.tsx`), not the selection-style one
(`xi-look`/`xi-shape`) it previously followed.

0175 kept picks open so the live recolour behind the 0.72 detent worked
as a preview. In practice a pick is already COMMITTED the moment it is
made — nothing is pending, so staying open only makes the reader hunt for
Close after every pick, and the dismissal animation reveals the full
recoloured board anyway: the preview argument survives as the exit.

⚠ The write lands BEFORE `back()` — the sheet never dismisses with an
uncommitted tap. Close stays as the no-change way out, and the 0.72
detent stays with it: the crown is still visible while browsing, which
is where the swatch-vs-board comparison actually happens.

`xi-look`/`xi-shape` are untouched: their picks are iterative (trying
formations/looks back to back), this one is terminal.
