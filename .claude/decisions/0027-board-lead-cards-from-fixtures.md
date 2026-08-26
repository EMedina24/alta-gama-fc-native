# 0027 — The Today board's live and last-result cards read `/cronogol/fixtures`; the scoreboard is not read by the app

- **Date:** 2026-08-25
- **Status:** Accepted. Narrows the "still read for the in-progress tile" clause of 0022.
- **Decided by:** Ed Medina

## Context
`MatchBoard` implemented the in-progress and last-result cards, but the Today
screen only ever passed `next`. Wiring them meant choosing a source. 0022 had left
the scoreboard (`GET /cronogol/scores`) one job: "the in-progress tile and its
`lastUpdateAt` age line", and `useScoreboard()` sat unused waiting for it.

Both lead cards are about **the reader's followed club**. The scoreboard cannot
say which of its rows is that club's: it is a world feed with "no shared ids, no
slug, no crosswalk" to `GET /cronogol/teams`, and 0022 already rejected
name-matching as "a visible, confident lie". So the one job it had been kept for
is a job it cannot do.

Meanwhile the fixture route carries `status: "live"` with the goals as of the last
sweep (every ~3h, `CRONOGOL-API.md` "Consequences worth designing for"), on rows
keyed by our own `homeTeam.slug` / `awayTeam.slug` with our own crests.

## Decision
- **Live card** — the earliest `status: "live"` fixture involving a followed club,
  from the `todayBounds` window (fresher, already fetched) falling back to a new
  14-day `recentBounds` window.
- **Last-result card** — the newest `finished` fixture with **both** goals present
  involving a followed club, from the 14-day window. `finished` + null goals (a
  degraded-ingest shape) is skipped, not dashed.
- Selection is pure logic in `lib/cronogol/board.ts` (no native import), the same
  pattern as `push.ts`, so it can be proven in a plain-JS harness.
- W/D/L is from the **followed club's** perspective (`boardOutcome`; home wins a
  derby tie) and rendered through `phrases.formLetters` — Spanish `D` is a loss.
- **The score-age line stays**, but the fixture route has no per-row stamp, so
  `lastUpdateAt` is `null` and the copy states the cadence ("Score as of the last
  check · updates roughly every 3h") rather than a number. It is **never** our own
  fetch time — that could only understate the age, the wrong direction for an
  honesty line.
- `useScoreboard()` and `keys.scores` are removed. `getScores` stays in the ported
  client (ADR 0018) and in `_debug`.

## Consequences
- The app's UI no longer reads `/cronogol/scores` anywhere. 0022's "still read for
  exactly one job" is no longer true; this entry is the record of why.
- The "~4h" in the age copy became "~3h": it now describes the fixture sweep.
- One extra fixture-window request on Today (14 days, followed clubs only matter
  client-side). Keyed by day + `'recent'`, `STALE.feed`.
- A live card can show a score that is up to three hours old, with a line saying
  so. That is the design's own contract (SPEC §3.1, handoff trap 8).

## Alternatives considered
- **Scoreboard for the live card, fixtures for identity** — needs the forbidden
  name join to know which scoreboard row is ours.
- **Scoreboard `lastSourceUpdate` for the age line beside a fixture-route score** —
  a stamp from a different feed describing a different row; precise-looking and
  wrong.
- **React Query `dataUpdatedAt` as the age** — says when we read, not when the
  source did; understates by up to a sweep.
- **Per-club `/cronogol/teams/{slug}/fixtures` for the last result** — one request
  per followed club versus one window; and its `to` is inclusive, the other trap.
