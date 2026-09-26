# 0214 — The builder's sheets, and where its numbers come from

- **Date:** 2026-09-26
- **Status:** Accepted
  - The picker, the card, the club sheet, the lineups sheet, the save sheet
    and the export sheet were all seen on the simulator with live Barcelona
    data.
  - Save, load, delete, Replace and export by tap are NOT verified (the
    simulator ran headless).
- **Decided by:** the `handoff_lineup/` design; Ed kept the export.
- **Amends:** [0065](./0065-starting-xi-builder.md) §7–8 and §10 (the sheets,
  the long-press menu). [0073](./0073-xi-export-render-in-context.md),
  [0074](./0074-export-receipt-state.md) and [0075](./0075-card-caption-reserve.md)
  stand.

## Context

The handoff replaces drag-and-drop with tap-and-sheet, adds a player card with
stats, and drops the image export. Ed chose to keep the export.

## Decision

- **Root-stack formSheets**, one `Stack.Screen` line each (trap 19). On iOS 26
  a partial detent already floats inset with a large radius, which is the
  handoff's sheet.
  - **`xi-pick`** (`[0.8, 1]`):
    - search: accent-folded, or an exact shirt number;
    - a band filter that opens on the slot's own band;
    - rows grouped by band with goals · assists;
    - a lime "where is he" line, dimming players placed elsewhere;
    - a pick is `place` or `toBench`.
  - **`xi-player`** (fit):
    - the four tiles are a 2 × 2 grid, because a quarter-width tile cut
      "ASISTENCIAS" in Spanish;
    - Season / Recent seasons;
    - Replace (`back()` then `push(xi-pick)`), Move to bench (disabled when the
      bench is full), Remove. Bench players get Remove only.
  - **`xi-club`**, **`xi-lineups`** (delete asks first), **`xi-save`** (it
    re-checks what Save needs; a blank name is "Lineup n" in the reader's
    language).
  - `xi-shape` and `xi-look` are deleted.
- **The formation pop-over is in-screen opaque paint** (traps 59, 69, 71, 74).
  It fades up, and a pick closes it in the same commit.
- **Stats:**
  - **Fetching.** `useSquadStats` shares the query key of `usePlayerStats`, is
    gated by `statsSlug` (LaLiga only today) and throttled four at a time by
    `lib/limit.ts`.
  - **Season** reads the season BY VALUE (`pickPlayerTotals`), never
    `seasonTotals[0]`. Yellows show only above the coverage floor: Raphinha's
    2026 block answers `yellows: 0` below it.
  - **Recent** is `overall`, captioned "Across n seasons" and never "Career",
    because it sums at most three seasons.
  - **Null renders an empty cell.** The handoff's em dash is not ported.
- **Export moves** to the controls row's share circle, where the handoff has
  Settings (its Language control duplicated `/settings`).
  - The capture registry is keyed by HOST (`'tab' | 'club'`) and registered on
    mount, not focus: a formSheet blurs the screen beneath it, and NativeTabs
    keeps the tab's builder mounted under a pushed one.
- **Clear keeps its confirm.** Clear now takes the bench too, and a saved
  lineup is the only undo.

## Consequences

- A league without player stats shows the card's note instead of a toggle,
  and blank goals · assists in the picker.
- `SheetClose`, `GlassPill` and `XiPlayerRow` are new molecules.
  `player-sheet.tsx` keeps its own ✕ for now.
