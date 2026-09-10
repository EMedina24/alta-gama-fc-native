# 0145 — "Assisted by" becomes goals by matchweek

- **Date:** 2026-09-10
- **Status:** Accepted
- **Decided by:** Ed (the replacement), Claude

## Context

The Players mock has an **Assisted by** panel — a horizontal bar chart of the
scorer's most frequent assisters. It is the one panel in `handoff_season-stats/`
with nothing serving it. `CRONOGOL-API.md`: *"No head-to-head, no scorer–assister
partnerships, no goal maps"*, and the folder's own `API-SEASON-STATS.md` is
blunter — *"that mock panel has no endpoint behind it and is not one query away:
it needs a new grain on the backend"*.

The prototype's `partners: {labels: ['Raphinha','L. Yamal',…], data: [7,6,3,2,2]}`
is hand-written mock data.

## Decision

The panel is replaced by a **goals-by-matchweek** bar strip, from
`PlayerSeasonStatsView.goalsByMatchweek`, which the payload already carries.

⚠ **It carries no total and no percentage.** `goalsByMatchweek` is SPARSE and
covers only fixtures that have a matchweek, so it does not sum to `goals` and any
share built on it would be wrong — the same trap as `goalsByBand`, and the API
doc calls it out separately for exactly this reason.

## Consequences

- No backend work, and no fabricated chart. The Players view keeps six panels.
- The slot stays a bar chart, so the card rhythm the mock designed survives.
- ⚠ It is empty for a Champions League block: knockout rounds carry no matchday.
  The card is not drawn when the record is null or empty, per
  [0143](./0143-a-null-renders-as-absence.md).
- Partnerships remain buildable — the events are stored, the grain is not — so
  this is a substitution, not a closed door.

## Alternatives considered

- **Build the partnerships grain in `senpai-backend` first** — real work in
  another repo to fill one panel; out of scope for this change, and Ed's call
  was to ship the surface.
- **Drop the panel** — leaves a gap in a card sequence that was designed as one.
- **A league rank card from `/cronogol/stats/leaders`** — real and live, but it
  is a fact about the LEAGUE on a screen about one player, and the leaderboard
  request is already spent choosing the default player.
