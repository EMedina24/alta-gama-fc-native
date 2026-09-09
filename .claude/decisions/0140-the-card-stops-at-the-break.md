# 0140 — The card stops at the break: `ClockBar` holds at the half, and the live widget drops its LaLiga pin

- **Date:** 2026-09-09
- **Status:** Accepted — widget target typechecks at its iOS 18 floor; `activity-harness` builds and
  passes the full sweep with the new break fixture, renders re-shot at all nine device widths.
  ⚠ The bar is judged from `/tmp/renders/card-halftime-w*.png`; a live break is the real test.
- **Reported by:** Ed, from a lock screen — `1:25:50` on a match whose true minute was ~75
- **Pairs with:** `senpai-backend` [0057](../../../senpai-backend/.claude/decisions/0057-the-clock-stops-at-the-break.md),
  which is where the actual fix lives
- **Amends:** [0139](./0139-live-crests-fall-back-to-the-fixture-row.md), whose "filed not fixed:
  the widget's live gate stays LaLiga-pinned" this closes

## Context

Ed's Live Activity clock ran straight through half time and stayed ~10–15 minutes fast for the whole
second half. **The diagnosis landed almost entirely in the backend** — this app never starts, updates
or ends an activity (`LiveActivityModule.swift`), and the clock anchor is a server decision. The
Swift's stopped-clock branch was already correct: nil `clockFromEpoch` prints `minuteLabel` and the
timer stops.

Two things here still needed changing, and both are consequences of the backend fix rather than
causes of the bug.

**1 · `ClockBar` held FULL when the clock stopped.** Correct for the whistle, and until backend 0057
that was the *only* stopped state that could occur mid-card: `phaseOf` could never return
`half_time`, so this branch had never once rendered at a break in production. Once the break
publishes, a full bar jumps the foot from ~50% to 100% and back down at the restart — the bar
claiming to be further through the match than the match is.

**2 · The home-screen widget pinned `?league=laliga`.** The route was LaLiga-only when
`Live.swift` was written. It stopped being so when the Premier League joined, and 0139 recorded both
the new truth and the fact that this line still contradicted it. No PL match — and no cup or European
tie of a PL club — had ever reached the home screen.

## Decision

**`ClockBar`'s stopped branch takes a fraction, not a constant.** `half_time` holds at `0.5`;
everything else keeps the full bar. Drawn with a `GeometryReader` + `Capsule` rather than
`ProgressView(value:)` — the bar is 3pt tall inside a capsule mask, and the system style adds its own
track and insets that fight the mask at that height.

⚠ The default stays `1`. An emptied bar at full time reads as "not started", which is the failure the
full bar was chosen to avoid; only the break is mid-match.

**`Live.swift` drops the query parameter entirely.** Coverage follows whichever provider is syncing,
so the unfiltered route is the whole of what is being played.

`MatchAttributes.swift` gains `extra_time` and `penalties` in its `phase` vocabulary comment, and
`PEN` in `minuteLabel`'s — documentation only. Both arrived free because `phase` is deliberately a
`String` rather than an enum, precisely so a phase the backend grows later degrades to "draw the live
layout" instead of to a decode failure that would discard the score with it.

`activity-harness.swift` gains a `halfTime` fixture, wired into both the height sweep and the PNG
loop, because a branch that has never rendered is a branch nobody has looked at.

## Consequences

- The foot bar reads honestly across the interval: ~50% at the break, ~51% at the restart, no jump.
- The home-screen widget shows Premier League matches, and PL clubs' cup and European ties. ⚠ This
  also means it inherits 0139's still-open finding: **one match can arrive as two fixtures**, so a
  reader following both sides may see it twice. Unchanged by this entry, and now reachable on more
  matches than before.
- ⚠ The harness cannot judge the *running* bar. `ProgressView(timerInterval:)` does not render under
  `ImageRenderer` — it comes out as a full bar with an error glyph, visible in `card-typical-*.png`
  and pre-dating this change. Only the static branch is verifiable offscreen, which happens to be
  exactly the branch this entry touches.
- No TypeScript changed. The in-app live card still prints the polled minute and has no ticker, so it
  cannot drift; it simply holds at 45′ through the break rather than saying `DES`. Improving that
  needs `period` on `GET /cronogol/live`, which backend 0057 deliberately deferred.

## Alternatives considered

- **Hide the bar at the break.** Rejected for the same reason the full bar was chosen over an empty
  one: a card whose foot vanishes mid-match looks broken.
- **Push a real fraction per minute.** Rejected — that is exactly how Apple's update budget is
  exhausted inside one half, and the whole design of this card is built to avoid it (backend 0034).
- **Keep `?league=laliga` and add `?league=premier-league` as a second fetch.** Rejected: two requests
  from a timeline provider that has seconds, for a route whose unfiltered form already answers. Any
  parameter other than `league` is a 400 in any case.
- **Fix the double-fixture bug (0139) while in this file.** Declined — it is a dedupe question about
  the route's contract, not a widget question, and it deserves its own entry rather than riding along
  on a one-line URL change.
