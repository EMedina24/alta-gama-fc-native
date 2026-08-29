# 0063 — NEXT UP is the first card on the Today board; only a live match outranks it

- **Date:** 2026-08-29
- **Status:** Accepted — not yet verified on the simulator
- **Decided by:** Ed Medina

## Context
`MatchBoard`'s non-live stack rendered LAST RESULT above NEXT UP, in chronological
order. On the Today screen that put the card the reader most often opens the app
for — when is my club's next kickoff — second, under a result they were already
pushed (ADR 0037) and that the widget already shows.

## Decision
In `MatchBoard`, NEXT UP renders first and LAST RESULT beneath it. The LIVE card
path is unchanged: a match in progress still replaces the whole stack, because
nothing outranks a match being played right now.

## Consequences
- The board reads future-first, not chronologically. The `SectionHeader` for
  FINISHED TODAY still follows the board, so the screen goes next → last →
  today's results → upcoming.
- The next-up card's lime border (`nextCard`) is now the first thing under the
  header; the result card's flush style sits below it.

## Alternatives considered
- **Chronological (last → next)** — the previous order; buried the card the
  screen exists for.
- **Hide LAST RESULT once NEXT UP exists** — loses the events disclosure
  (ADR 0045/0050) that has no other home on this screen.
