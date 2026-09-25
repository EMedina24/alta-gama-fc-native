# 0190 — A played club-page row opens a match-stats sheet built from events

- **Date:** 2026-09-24
- **Status:** Accepted
- **Decided by:** Ed asked: *"Clicking on one of these concluded matches should
  pop up (slide up) a card with that match's stats and some fancy chartjs
  chart (animated)"*. He then made two scope calls:
  - an **events-only** sheet now, with backend team stats deferred;
  - charts drawn **the way the Season stats screen does**, not Chart.js.
- **Builds on:** [0142](./0142-charts-are-drawn-not-imported.md) (charts are
  drawn, not imported) and [0045](./0045-match-events-expanded-row.md) (the
  events timeline).

## Context

- **The API has no per-match team statistics.** `CRONOGOL-API.md` says:
  *"Shots, xG, possession, passes, saves and duels do not exist … not for any
  club"*.
  - The league sources do publish team-level match stats for free, but
    ingesting them is backend work (`match-data-ingest-plan.md` Tier 3,
    `match_team_stats`), which is unbuilt.
- What a finished match does have is its events timeline: goals, own goals,
  assists, cards, subs, VAR and missed penalties, each with a minute and a club.
- Chart.js is a web library. On iOS it would need a WebView, which means a new
  dependency and a native rebuild, a blank frame on open, and motion that
  doesn't feel native.
- 0142 already settled the question: charts in this app are react-native-svg
  plus Reanimated.

## Decision

1. **Only a played row is tappable.** `SeasonSpine` takes `onOpen` and wraps a
   card in a `Pressable` only when the row is played (`finished` with a score).
   - Upcoming rows stay plain `View`s, so there are no dead buttons for
     VoiceOver.
   - Pressing a card scales it to 0.98 instead of fading it, because past cards
     already sit at 0.62 opacity.
   - VoiceOver reads the card as one stop: "at Girona, 4–1".
2. **A `formSheet` at `(sheets)/match-stats`**, with params `{ slug, id }` and
   detents `[0.75, 1]`, declared in the root stack (0030).
   - The fixture is a cache read of `useClubFixtures(slug)`, re-read as a
     neutral row with `teamWindowRows`. No score or names travel as strings.
3. **The sheet's contents:**
   - **Scoreline:** the fixture's score, which is authoritative. Each side's
     line carries a colour swatch that keys the chart.
   - **Goal flow:** a step line per side over MINUTES, with a dashed half-time
     rule and a gradient fill.
   - **Head to head:** goals, yellow cards, red cards and substitutions as
     mirrored bars, where the row's leader fills its half.
   - **Timeline:** the existing `MatchEvents`, which shares the same query key,
     so the sheet costs one request.
4. **Colours:** the club whose page opened the sheet is `accent`; the other
   side is `chartSeriesAlt`. The club's series paints last.
5. **Motion:** one `progress` clock (`SeasonStats.count`, ease-out cubic)
   drives three things:
   - the chart's draw-in, an animated `ClipPath` rect that runs on the UI
     thread with zero re-renders;
   - the bar widths;
   - the `AnimatedNumber` digits.

   It starts when events arrive, not at mount, and is cancelled on dismiss.
   Reduce Motion is handled by Reanimated (trap 63).
6. **Derivation rules** (`lib/cronogol/match-stats.ts`, pure):
   - **An own goal credits the OTHER side.** The wire's `teamSlug` is the
     scorer's club.
   - A goal's x position is `minute` alone, never `minute + minuteExtra`, so a
     45+2 goal stays left of 46′.
   - Feed order is never sorted.
   - The axis runs to 90, or to the last goal if it came later.
   - A goal with no minute or no side is counted as `unplaced`, not guessed.
7. **An empty timeline hides both charts.** `MatchEvents` says "not published
   yet", because an un-swept 4-1 and a real 0-0 look identical on the wire.
   Two flat lines would state the 0-0 as fact.

## Verification

- A plain-node check ran `goalFlow` over all 14 finished Barcelona and Girona
  payloads (live API, 2026-09-24).
  - The per-side goal totals matched the fixture score on **14 of 14**,
    including 3 own goals.
- In the simulator (iPhone 17 Pro):
  - Girona 5-2 Las Palmas, deep-linked, screenshotted mid-draw and at rest.
  - Córdoba 2-1 Girona opened by a real tap on the row, at the full detent
    with the timeline, confirming the away-side colours.
- Not hand-checked: the empty (un-swept) state, which is `MatchEvents`'
  existing branch, and VoiceOver.

## Consequences

- When the backend ships team match stats, `VersusBars` can take possession
  and shots as more rows, and the header comment says where. The goal-flow
  chart is unaffected.
- A Champions League tie on a club page uses the LEAGUE events route with the
  club fixture id, which the API supports for tracked clubs (0156/0137).
