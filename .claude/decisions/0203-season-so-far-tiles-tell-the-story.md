# 0203 — The SEASON SO FAR tiles tell the story

- **Date:** 2026-09-25
- **Status:** Partly superseded — the mini charts by [0204](./0204-season-so-far-becomes-rings.md) (rings); labels, captions and the one clock stand. Was: Accepted
  - `tsc` is clean; lint is unchanged (the 5 errors and 1 warning were already
    there).
  - **Simulator-verified on an iPhone 17 Pro (iOS 26.5) against production,
    in Spanish,** on Villarreal, Barcelona, Real Madrid and Atlético:
    - A burst capture caught the entrance mid-count (33 on its way to 36, 7 to
      8) with the bars drawn.
    - Atlético's clean-sheet dots line up with its goals-against stubs.
  - ⚠ **Not hand-checked:** Reduce Motion (it jumps by construction, trap 63)
    and VoiceOver.
- **Decided by:** Ed, on the club page's three tiles: *"lets add some labels
  and charts to these stats, maybe some animations"*.
- **Follows:** [0202](./0202-the-club-page-wears-the-kit.md), whose GF / GA /
  CLEAN SHEETS tiles these replace. The motion follows
  [0141](./0141-season-stats-reads-one-block.md)/0142's `SeasonStats` clock.

## Decision

1. **Labels:**
   - Each tile is headed by its full name ("GOLES A FAVOR", "GOALS AGAINST",
     "PORTERÍAS A CERO") instead of a code.
   - Under the number is a caption that puts it in proportion: per match for
     goals (the Season stats screen's `perMatch` over
     `coverage.fixturesTotal`), and "3 of 8 matches" for clean sheets.
   - A single line under the row says what the charts plot: "Last 8 matches".
2. **Charts: the last `SeasonTiles.window` (10) matches of the MERGED timeline,
   newest on the right.**
   - The timeline is a real kickoff-ordered chronology across competitions
     (0149), and `sum(timeline[].gf) === goalsFor`, so no bar can disagree with
     its number.
   - **Goals for:** `MiniBars` in white.
   - **Goals against:** `MiniBars` in `danger`, on the SAME scale as goals for,
     so a conceded goal is as tall as a scored one.
   - **Clean sheets:** `MiniDots`, lime where `ga === 0` and a hollow ring
     otherwise. Lime is the Season stats screen's own clean-sheet ink (0142).
   - **A zero still draws**, as a hairline stub: a goalless match is a fact,
     not a gap.
   - **A season younger than the window** leaves its empty slots on the left,
     so the newest match always sits at the right edge.
3. **Animation: one clock.**
   - `SeasonSoFar` owns a `progress` value that runs 0 → 1 over
     `SeasonStats.count` with ease-out cubic, started on mount and cancelled on
     unmount. Returning to Overview replays it.
   - Numbers count up (`AnimatedNumber`).
   - Each bar grows from its foot (`scaleY` with `transformOrigin: 'bottom'`, a
     UI-thread transform, never an animated height) over `SeasonStats.draw`,
     `SeasonStats.barStagger` after its left neighbour.
   - Each dot pops from 0.3 to full size on the same stagger.
   - Reduce Motion needs no branch (trap 63): Reanimated skips the timing, so
     everything lands final.
4. **Layout (`ChartTile`):** the label and number are pinned to the top, the
   caption and chart to the foot.
   - Saira's descent leaves about 18pt of air under a 42pt number. 0194's line
     height cannot give that back.
   - **Measured on the simulator:** a negative margin that tucked the caption
     up (12, then 24) collided the number with a two-line label. So the air now
     lives in the flexible middle.
   - The row stretches the tiles to one height, so every number and chart sits
     on a line.

## Consequences

- New tokens: `SeasonTiles` (`window`, `chartHeight`, `stub`, `dot`,
  `dotFrom`).
- New atoms: `MiniBars`, `MiniDots`. New molecule: `ChartTile`. New organism:
  `SeasonSoFar`.
- `StatTile` stays as it was for Today's counters.
- Each tile is one VoiceOver stop that speaks the number and the caption, not
  the bar heights.
