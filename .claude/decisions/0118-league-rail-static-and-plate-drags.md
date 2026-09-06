# 0118 — The league rail goes static and its plate drags like the nav's

- **Date:** 2026-09-05
- **Status:** Accepted
- **Decided by:** Ed ("the glass pane should be draggable just like the main
  nav … The rail should be static and not scrollable. Can we please reduce
  the size of the league icons so they all fit", off simulator screenshots
  of 0117's first build)
- **Amends:** [0117](./0117-league-rail-liquid-plate-slide.md) — the rail no
  longer scrolls; [0116](./0116-crown-league-chips-larger-cut.md) — the crown
  MARK returns to its first cut (the chip height keeps 0116's 52)

## Decision

`LeagueSwitch`'s rail becomes a **static, full-gutter-width capsule** — the
ScrollView is gone; every league is an equal flexed slot — and the
liquid-glass plate becomes **draggable**: a pan tracks the finger along the
rail and snaps to the nearest slot on release, committing that league. The
NativeTabs bar's behaviour, both halves.

- **Static fit:** five leagues share ~350pt of gutter, ~61pt a slot, so the
  crown mark drops from 66×33 back to 0116's first cut **54×27**
  (`leagueChipMarkWCrown/HCrown`); the ground mark keeps 0089's 44×22 and
  every chip height stands. 0116 sized the mark for a row that could scroll;
  a static rail trades mark size for whole-set visibility — Ed picked the
  trade explicitly. The slot `gap` is gone too: contiguous slots are what let
  the plate span one cleanly.
- **The drag:** `Gesture.Pan` on the rail with the deck's thresholds, now
  `Glide.activateX` 10 / `Glide.failY` 8 — taps under 10pt of travel fall
  through to the chips, and a mostly-vertical drag fails to the screen's
  scroll ([0113](./0113-same-day-next-up-deck.md)'s contention rule). The
  plate clamps to the rail's slots while tracking; release snaps
  `Glide.spring` to the nearest slot center and commits via `runOnJS` —
  same change-only `hapticToggle()` as a tap.
- Finger tracking is direct manipulation and stays under Reduce Motion
  (0113's rule); the release snap becomes an assignment.
- The plate's shared values move UP into `LeagueSwitch` (the gesture writes
  them); `SelectionPlate` keeps only the reads — the deck's `DeckLayer`
  compiler split, inverted.
- Marks do NOT light up under the hovering plate mid-drag — the crossfade
  still keys on the committed selection at release (recorded divergence from
  the system bar; revisit only if the drag feels dead on device).

## Consequences

- The rail spans the content gutter on every screen; a sixth league shrinks
  all slots rather than scrolling — the mark tokens are the lever if that
  day comes.
- The drag needs every slot measured before it enables (`onLayout`
  completeness gate); until then taps work and the pan is inert.
- ⚠ 54×27 on the crown is exactly the cut 0116 rejected as "too small" —
  but that judgment was made against 52pt chips showing ~4 marks at 66 wide;
  the static rail's slots are the new constraint. Device-judge again; if it
  reads small the trade to revisit is chip height, not scrolling.
