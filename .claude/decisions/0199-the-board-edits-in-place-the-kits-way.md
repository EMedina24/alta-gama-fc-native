# 0199 — The Board edits in place, the kit's way

- **Date:** 2026-09-25
- **Status:** Accepted
- **Verification:**
  - `tsc` is clean; lint is unchanged (the 5 errors and 1 warning were already
    there); `board-layout-harness` passes.
  - **Simulator-verified on an iPhone 17 Pro (iOS 26.5) against production,
    with real taps and drags:**
    - enter by pencil (tab bar hides) and by the `?boardEdit=1` hook
    - hold-and-drag FINISHED TODAY above NEWS, with the edge auto-scroll
      carrying it, the order persisted
    - `−` hides a card, and the "+ News" chip restores it to its slot
    - Reset restores order, cards and background
    - a LaLiga tile recolours the board live
    - the strip opens on the current pick
    - Done exits and the tab bar returns
  - ⚠ **Not hand-checked:** the "More" tile into the sheet, VoiceOver's move
    actions, Reduce Motion, Spanish at 335pt, and the pre-26 opaque path.
- **Decided by:** Ed: *"lets implement the design systems 'edit' screen on the
  'today' screen"*, with the Medina kit's `TodayScreen startEdit` mock. He
  answered four questions before building:
  1. **Real cards in edit mode**, like the kit (over keeping 0174's rows).
  2. **The kit's bottom glass panel** for the background and the hidden cards.
  3. **The lead card stays pinned.**
  4. **Reset restores everything**: order, hidden cards and background.
- **Supersedes:**
  - [0174](./0174-the-board-is-the-readers.md) §9 (name rows), §13 (the hint
    bar in the crown) and §14's crown-capsule DONE
  - [0175](./0175-the-board-wears-the-readers-background.md)'s Background row
    and its layout-only reset
- **Keeps:**
  - 0174's logic layer: `board-layout.ts`, `bd*`, `applyVisibleOrder`,
    commit-on-release, the membership check
  - the 150 ms hold on the grip (§8)
  - VoiceOver's move actions (§12)
  - the edge auto-scroll (§15)
  - the pulsing DONE (§18)
  - removal left unmentioned in the hint (§13)
  - 0183 (a pick in the sheet closes it)

## Context

The Medina iOS kit's Today edit mode differs from ours in several ways:

- It draws the real cards, a step back, with a grey `−` disc and a grip on
  each.
- It turns the header's controls into one lime "✓ Done" pill.
- It hides the tab bar.
- A floating glass panel holds a row of background tiles, a Reset, and chips
  for hidden cards.

Ours drew 72pt name rows with a hint bar in the crown, a background row that
opened a sheet, and an add tray.

0174 §9 dropped cards in edit mode after measuring them. That was a
**clipped window** onto each card, which landed mid-sentence and printed the
section name twice. A whole card scaled down has no window. So this reverses
the rows without reversing the finding.

## Decision

1. **Edit mode draws the real cards** (`board-stack/edit-card.tsx`, replacing
   `edit-row.tsx`).
   - Each card is scaled to `BoardEdit.editScale` (0.965). It is inert:
     `pointerEvents="none"` and its descendants hidden from VoiceOver. It
     carries one stop, "name, summary", with `moveUp` / `moveDown`.
   - **Both badges straddle the top edge** at `removeInset` (−9), and the
     content drops by `chromeTop` (19).
     - The kit's grip sits 10pt inside the card. Four of our five cards open on
       a bare `SectionHeader`, whose title and meta sit exactly there.
     - On the simulator the badges read as a tab above FINISHED TODAY and
       UPCOMING.
   - **The `−` disc is the kit's grey** (`removeFill`), over 0174's red.
   - **The grip is flat grey, not glass.** It rides the card's scale
     transform, and a scaled ancestor kills liquid glass (0120/0122).
   - The lifted card returns to scale 1.0 with 0174's shadow.
2. **The drag runs on MEASURED heights.**
   - Cards report their height through `onLayout` into
     `DragState.heights`. A card's top is `topOf(order, heights)`, a worklet.
   - The stack stays absolutely positioned, so a drop commits with no flicker.
   - It holds `opacity: 0` until every card has a height, for one frame.
   - **The swap rule:** every other card is "before" the lifted one when the
     lifted card's centre passes that card's midpoint, with `swapBias` of
     hysteresis toward the side it is already on.
   - ⚠⚠ **The heights accumulate in a JS ref and are pushed whole.** A shared
     value written from the JS thread does not read back on the JS thread
     until the UI runtime takes the write. Five back-to-back `onLayout`s each
     spread `{}`, kept only the last card, and the stack waited forever. The
     simulator caught it.
3. **The lead card stays pinned** (0174 §6): no badges, and not scaled.
   - It is glass, and a scale transform would kill the glass.
   - The hint left the crown for a caption at the top of the body
     (`copy.board.hint · count`). So `payload` is `lead` alone in both modes,
     and trap 76 cannot happen.
4. **DONE is `ChipButton tone="fill"`**: a solid lime pill with a leading
   `Check` and `onAccent` ink, still pulsing.
   - `fill` is a new tone rather than `active`, because `active` announces
     "selected" to VoiceOver, and DONE is an action.
5. **The tab bar hides while editing** (`<NativeTabs hidden>`).
   - The flag lives in `store/board-edit.ts` (`useSyncExternalStore`), because
     `NativeTabs` sits above the screen.
   - The tab layout also derives the `__DEV__` `?boardEdit=1` hook from
     `useGlobalSearchParams`. No effect copies one source into another.
   - The screen's `useFocusEffect` cleanup turns the mode off on blur or
     unmount, so a hidden bar can never outlive the screen.
6. **The bottom panel** (`board-stack/edit-panel.tsx`) is published through
   the scaffold's overlay slot (0163).
   - It is a `GlassSurface` (regular) at radius 40, with an opaque `panelFill`
     below iOS 26.
   - **Contents:**
     - a decorative `Grabber`
     - "Background" with Reset beside it
     - a strip of `SceneTile`s (a new molecule, 62×100): the pick's crown ramp
       over the ground, its mark as a watermark, and a white ring when
       selected
     - "Hidden cards" chips, when any card is hidden
   - The stack ends in a spacer as tall as the panel, and the drag's bottom
     edge band sits above it.
   - **The strip:** Default, the reader's followed clubs, then every league,
     then **More**, which opens the existing full-catalogue sheet.
     - A current pick that is none of those is slotted in after Default.
     - The strip opens scrolled to the pick (`contentOffset`, read at mount).
   - The option builders moved to `features/board/background-options.ts`. The
     sheet route and the screen share them.
7. **Reset is `resetBoard()`**: `bdOrder`, `bdHidden` and `bdBg` in one write.
   `resetBoardLayout` stays for `_debug/reset-board`.
8. **Deleted:**
   - `board-stack/add-tray.tsx`, `background-row.tsx`, `hint-bar.tsx`
     (`BoardEditHint`) and `edit-row.tsx`
   - the `BoardEdit` tokens `rowHeight`, `rowFill`, `hintFill` and `handle`
   - the copy keys `addTitle`, `allOn`, `reset` and `backgroundRow`

   New copy (EN and ES): `hiddenTitle`, `resetAll`, `resetAllLabel`, `more`,
   `backgroundTile`.

## Consequences

- Edit mode is much taller. UPCOMING alone measured 881pt with six fixtures, so
  a long drag leans on the edge auto-scroll. The scroll carried FINISHED TODAY
  past NEWS on the simulator.
- Live data keeps rendering inside the inert cards, and heights are
  re-measured when they change. A refetch that changes which cards are on the
  board mid-drag is still caught by the drop's membership check.
- Edit mode's only lime element is DONE. The selected tile is ringed in white,
  and the chips' `+` is `text`, not the glyph's lime default.

## Alternatives considered

- **Keep 0174's rows and only restyle them.** Offered, and Ed chose the real
  cards.
- **Uniform slots with the cards clipped.** That is 0174's veiled card again.
- **Put the tab-bar flag in React context.** `NativeTabs` renders above the
  screen, so the context would have to live in the tab layout and be written
  from below. A module store is the repo's existing pattern for exactly that.
