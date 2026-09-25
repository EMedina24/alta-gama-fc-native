# 0200 — Matchdays wear the kit

- **Date:** 2026-09-25
- **Status:** Accepted
  - `tsc` is clean; lint is unchanged (the 5 errors and 1 warning were already
    there).
  - Simulator-verified on an iPhone 17 Pro (iOS 26.5) against production, on
    Premier League matchday 6.
  - Not hand-checked: Spanish, the UCL tab, and a pill or Calendar tap.
- **Decided by:** Ed, with the Medina kit's `MatchdayScreen` mock:
  *"lets implement the updated matchweek screen please"*. Two calls, asked
  before building:
  - **Calendar goes neutral glass**, like the mock.
  - **The venue line stays** under each pair.
- **Supersedes:** [0157](./0157-the-calendar-cta-becomes-a-pill.md)'s lime
  ring on the Calendar pill.

## Context

The Matchdays tab already had the kit's structure (0162/0165):

- a league banner pill with the avatar
- the season eyebrow, a Saira title and the range line
- the round strip with Calendar
- day bands
- stacked fixture rows with a Saira kickoff

The kit differs only in material and scale.

## Decision

1. **The title is `Type.crownTitleXl`**: Saira ExtraBold 58/70, uppercase.
   - `ScreenScaffold` and `Crown` accept it as a third `titleVariant`.
   - Matchdays is the only screen using it. There, the title *is* the content,
     since it names the round being shown.
2. **Round pills:**
   - 44pt (`Size.roundPill`), `Radius.roundPill` 13
   - a `glassFill` fill with a `glassLine` hairline. It is a fill, not
     `GlassView`: a dozen glass views scrolling over the crown would be traps
     59/74.
   - numbers in `numeral` (Saira Bold 20, tabular)
   - Played rounds keep a step back: `glassFillDim` fill and `textSecondary`
     ink. The current round is solid lime.
   - `SLOT` follows the new size, so the snap and pinned-fit logic are
     unchanged.
3. **The Calendar pill is `ChipButton tone="glass"`:**
   - neutral fill and hairline, 44pt tall
   - a white `CalendarGlyph` (17) and a white label
   - The screen's one lime is the current round.
   - What says "button" is the glyph, the capsule and the verb.
4. **Day band:** `glassFillDim` plus a hairline top and bottom, with 14pt
   vertical padding.
5. **Row names** are `Type.headlineMd` (17/500), the kit's lighter weight.
6. **The venue line stays** as a faint footnote. It is real data that the mock
   lacks only because its fixtures are fake.

## Consequences

- Four pills fit beside Calendar at 402pt, against the mock's five. Five 44pt
  pills plus the Calendar pill are wider than the content, and the mock's own
  row overflows. The strip still scrolls and snaps to whole pills.
- `crownTitleXl`, `headlineMd`, `Size.roundPill`, `Radius.roundPill` and
  `Size.calendarGlyph` are new tokens. `ChipButton` gains `glass`.
