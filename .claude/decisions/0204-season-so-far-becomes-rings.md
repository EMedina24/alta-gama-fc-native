# 0204 — SEASON SO FAR becomes rings

- **Date:** 2026-09-25
- **Status:** Accepted
  - `tsc` is clean; lint is unchanged (the 5 errors and 1 warning were already
    there).
  - **Simulator-verified on an iPhone 17 Pro (iOS 26.5) against production,
    in Spanish,** on Sevilla, Celta and Getafe:
    - A burst capture caught the sweep mid-entrance (5 of 19 on its way to 10,
      1 of 7 on its way to 2).
    - At rest they match Ed's reference image.
  - ⚠ **Not hand-checked:** Reduce Motion (it lands final by construction,
    trap 63) and VoiceOver.
- **Decided by:** Ed, with the Season stats screen's clean-sheet ring as the
  reference: *"lets make these circle graphs like this"*. He chose **all three
  as rings, with the goals as a split**, over "as matches" and "clean sheets
  only".
- **Supersedes:** [0203](./0203-season-so-far-tiles-tell-the-story.md)'s mini
  bar and dot charts, and its "last N matches" note. 0203's labels, captions
  and single clock stand.

## Decision

1. **Three rings, each a share of a real whole:**

   | Ring | Arc | Centre | Colour |
   |---|---|---|---|
   | Goals for | goals scored ÷ all goals in the club's matches | "17", "/ 26" | lime |
   | Goals against | the other side of the same whole | "9", "/ 26" | `danger` |
   | Clean sheets | ÷ matches played (the merged timeline's length) | "3", "/ 8" | lime |

   The two goal arcs always add up to one full ring. Lime on clean sheets is
   Season stats' own clean-sheet ink (0142).
2. **Captions:**
   - goals: per match (Season stats' `perMatch`)
   - clean sheets: a percentage of matches ("29% de partidos", not "de los
     partidos", which truncated in a third-width tile on the simulator)
   - Captions shrink to fit (`adjustsFontSizeToFit`) inside the tile's box.
     Trap 77: the box, not the 4pt floor, is the limit.
3. **`SweepRing`** (a new atom): `RingGauge`'s look (track, rounded arc from
   twelve o'clock, the "cutout 78%") with the arc animated through
   `useAnimatedProps` on the clock the centre number counts on.
   - An animated SVG prop is what `RingGauge` refuses, but that rule is about
     full-screen charts. This is one `Circle`, three to a screen, still after
     `SeasonStats.count`.
   - The arc's opacity is 0 until it has length, because a round cap at zero
     length paints a misleading dot.
4. **`ChartTile`** becomes label, graphic, caption, with the graphic centred.
5. **Deleted:** `MiniBars`, `MiniDots`, 0203's `SeasonTiles` fields, and the
   `chartsNote` copy. `SeasonTiles` is now `{ ring: 84, cutout: 0.78 }`.

## Consequences

- The tiles read as the Season stats screen made small. "See all" leads to the
  same rings at full size.
- The per-match rhythm the bars showed (which matches were goalless) is gone
  from the club page. It lives on Season stats' own charts.
