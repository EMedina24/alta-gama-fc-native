# 0142 — Season stats charts are DRAWN, not imported

- **Date:** 2026-09-10
- **Status:** Accepted
- **Decided by:** Claude

## Context

Season stats needs seven chart shapes: a cumulative area line, two doughnut
rings, a two-tone bar series, a horizontal band chart, progress meters and a
squares strip. `handoff_season-stats/README.md` says *"on device use the
codebase's charting library (e.g. Victory Native / Skia)"*.

**The codebase has neither**, and both would be new dependencies.

## Decision

No charting library. The two genuinely curved shapes are hand-authored
`react-native-svg` — already a direct dependency and already how every mark in
this app is drawn (`competition-mark`, `pitch-glyph`, `wash-gradient`). Everything
else is a rectangle and is a plain `View`.

New atoms: `spark-area` (`Path` + gradient fill + optional rules), `ring-gauge`
(`Circle` + `strokeDasharray`, the shape `avatar.tsx`'s attention arc already
uses), `meter-bar`, `animated-number`. New molecules compose them with `Text`,
which an atom may not import ([0013](./0013-atomic-design-components.md)):
`goals-line` puts the axis labels on `spark-area` using an exported `sparkY` so
the number and the rule it names cannot drift; `bar-series`, `band-bars`,
`run-strip`, `stat-card`.

**Motion** is a `SeasonStats` block in the theme (`count: 1500`, `draw: 800`,
`barStagger: 22`) — a feature group like `Deck.spring` and `Splash.t`, because
`Motion`'s contract is the app's short shared durations and a 1500 ms count-up is
not a control settling. Card entrances deliberately do NOT read from it: they use
`Motion.enter`/`Motion.stagger` like every other staggered section, against the
mock's 700 ms and 80 ms, because `stagger`'s own note says past ~50 ms a step
blocks read as a queue and the Club view has seven cards where the account sheet
has five.

The count-up is this app's first `useAnimatedProps` — an
`Animated.createAnimatedComponent(TextInput)`, because Reanimated cannot animate
`Text` children. One shared clock per view drives ~20 numbers on the UI thread;
a JS-thread progress value would re-render seven SVG-bearing cards ~45 times
during entry.

## Consequences

- Zero new dependencies, no dev-client rebuild, nothing new to track across SDK
  upgrades ([0006](./0006-theme-constants-module.md)'s stated benefit).
- Four SVG traps apply and are answered in the atoms, not at call sites:
  translucency is `stopOpacity` and never an `rgba()` stop (trap 42); the
  gradient id is `useId()` (trap 40); the box is measured, not `100%`, because
  these cards change height on a view switch (trap 65 /
  [0138](./0138-wash-fills-a-box-that-grows.md)).
- ⚠ `adjustsFontSizeToFit` does not exist on `TextInput`, so trap 33's usual
  answer is unavailable. `AnimatedNumber` instead lays out a hidden sizer at the
  FINAL value's width — better anyway, since the column then cannot reflow while
  the digits change under it.
- Reduce Motion needs no branch in the count-up or the draw-in: Reanimated skips
  `withTiming` when the switch is on and the value jumps to target (trap 63),
  which for these IS the accommodation. The card entrances still guard
  `entering=` with `useReducedMotion()`, as every one in this app does.
- ⚠ The chart colour tokens (`chartSeriesAlt`, `chartTrack`, `chartGrid`,
  `chartMuted`, `accentDim`) and the numeral sizes (`statHero`/`statLg`/`statMd`)
  are APP-ONLY and must **not** be copied into `targets/_shared/Tokens.swift`
  (trap 15) — no widget draws a chart.
- The design's `scale(.987)` press feedback is DROPPED: nothing in this app
  animates a press, [0117](./0117-league-rail-liquid-plate-slide.md) rejected it
  on the league rail, and `Glide.swell` warns a transform scale over glass
  rasterises its backdrop.

## Alternatives considered

- **Victory Native / gifted-charts** — a build-config dependency and an upgrade
  liability for shapes that are two `Path`s and some rectangles.
- **Skia** — [0065](./0065-starting-xi-builder.md) already rejected it as "a
  second renderer for the same card".
- **A JS `requestAnimationFrame` count-up**, matching `countdown.tsx`'s idiom —
  correct for one number ticking per second, wrong for twenty animating over
  1.5 s above seven SVG cards.
