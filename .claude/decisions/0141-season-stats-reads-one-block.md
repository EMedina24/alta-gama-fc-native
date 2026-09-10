# 0141 — Season stats reads ONE block: the club's own league, this season

- **Date:** 2026-09-10
- **Status:** Accepted
- **Decided by:** Ed (scope + the four open questions), Claude (implementation)

## Context

`handoff_season-stats/` asks for a club-page child screen with two views behind
a segmented control. `GET /cronogol/teams/{slug}/stats` does not serve one
season — it serves **one block per COMPETITION-season**. Barcelona answers three
in a single payload today (2026 champions-league, 2026 laliga, 2025
champions-league) and the CUP block is `seasons[0]`, so the obvious read renders
a European record under a LaLiga heading.

The mock shows one season and offers no picker, because it was drawn against a
single hand-written fixture.

## Decision

`pickTeamSeason(stats, league, season)` selects the block matching the club's
own league (`League.apiSlug`) for `SEASON`. **No competition picker, no season
picker.** The league comes from `leagueOfClub(standings.data?.tables, slug)` —
the only thing that knows it, since no `TeamView` carries one — and an
unresolved league yields `null`, never a guess at the first block.

The screen lives at `/club/[slug]/season-stats`, a sibling of `starting-xi.tsx`
with no `_layout.tsx` in the folder ([0065](./0065-starting-xi-builder.md)), and
draws its own back chip like the club page rather than taking a native header
([0091](./0091-club-page-hero-and-trays.md)). The entry row sits directly under
Starting XI; both now render one `ActionRow`, because two adjacent rows that
differ by two points of tile size read as a bug rather than as two features.

It takes an optional `?mode=players` param, read once at mount. It exists
because the Players view was otherwise reachable only by a tap and therefore
unverifiable from a script — which is how its default player stayed wrong for an
afternoon (see below) — and it is the shape a push deep link would need later.

Three numbers on the header come from the league record and never from the
payload: `league.name` (never `LeagueRef.name`, which is `LALIGA EA SPORTS`),
`leagueSeasonLabel` (never bare `seasonLabel` — Puerto Rico prints `2026`), and
`roundCount` (never the standings' `matchesTotal`, which is 380).

## Consequences

- One request per club, cached at a new `STALE.stats` bucket (30 min): inside
  the 3-hourly rebuild, far above the route's own `max-age=300`.
- The club page fetches it too, so its entry row can say whether there is
  anything behind it. That doubles as the child screen's prefetch.
- A club's European record is unreachable from this screen. Adding it later is a
  chip row over `seasons[]` and no new endpoint.
- ⚠ **The Players view opens on the club's TOP SCORER**, resolved from
  `GET /cronogol/stats/leaders` (one cached request per league, shared by every
  club in it). The first squad row was the obvious default and was wrong on the
  first club tried: Barcelona's squad begins with a goalkeeper, who correctly and
  permanently answers `seasons: []`, so the tab opened on an empty state for the
  club with the most complete data in the app.
- A chosen player with no block keeps the identity strip and the Change chip
  (`PlayerEmpty`) rather than collapsing to a sentence — otherwise picking a
  keeper strands the reader with no way back but the segment.
- The chosen player lives in `store/stats-player.ts`, in memory, keyed by club.
  Not a route param: `router.setParams` after `router.back()` applies to
  whichever route is focused when it runs. Not persisted: a slug is neither
  unique nor permanent, so a stored one could resolve to a different footballer.

## Alternatives considered

- **Render `seasons[0]`** — renders a cup record under a league heading, today,
  on the first club tried.
- **A competition/season picker** — real UI the mock does not have, for data
  most readers will not ask for in v1. Deferred, not rejected.
- **Resolve the league from `primaryCompetition(fixtures)`** — that returns the
  wire's display NAME (`LALIGA EA SPORTS`), which cannot be matched to an
  `apiSlug` without a second lookup table.
