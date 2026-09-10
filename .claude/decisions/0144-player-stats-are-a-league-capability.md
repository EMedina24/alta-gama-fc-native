# 0144 — Player stats are a league CAPABILITY FLAG, not a probe

- **Date:** 2026-09-10
- **Status:** Accepted
- **Decided by:** Claude

## Context

`GET /cronogol/players/{slug}/stats` does not work everywhere. Serie A's events
carry a name string and no stable person id (two players sharing a name would
merge silently); the Bundesliga writes no events at all.

⚠ And the API's own coverage table is **optimistic about the Premier League**.
It lists PL player stats as supported, and they genuinely are computed — but
`slug` is `null` for every Premier League player on the wire, in squad rows AND
in leaderboard rows (verified 2026-09-10: all 49 of Arsenal's squad, and the whole
top of the PL goal chart). The slug is the only key the route takes, so with none
there is no URL to build.

**Trap 55**: an unsupported league answers `200` with an empty collection, not a
404 — so a segment gated on the response renders a convincing skeleton of
nothing, and inferring capability from an empty response is exactly how trap 32
happened.

## Decision

A `playerStats: boolean` on `League`, hand-copied from `CRONOGOL-API.md` and
corrected against the wire — beside `rounds` and `matchEvents`, which exist for
the same reason ([0105](./0105-lpr-clausura-and-league-capability-flags.md)).

**True for LaLiga alone.** False for the Premier League (no slugs), Serie A and
the Bundesliga (no player stats), and Puerto Rico (neither).

The Players segment renders only when `league.playerStats && squad has players`;
elsewhere the Club view stands alone, which is also the mock's own rule. A second,
independent gate is per-player: `statsSlug(player, league)` returns `null` unless
the league is capable **and** that row actually carries a slug — not redundant,
because a null slug anywhere would build `/cronogol/players/null/stats`.

Club stats need no flag: `coverage.sufficient` on the payload tells the truth
([0143](./0143-a-null-renders-as-absence.md)).

## Consequences

- A Premier League club's Season stats screen is the Club view, with no segment
  and no dead tab. Correct today and wrong the day the backend publishes PL
  slugs — at which point this is a one-line change with a harness assertion
  already pointing at it.
- ⚠ `SquadPlayerView.slug` is now on the type (the wire has carried it since
  2026-09-09; this repo's `types.ts` had not caught up) and its docblock records
  the PL nullness, so the next reader does not rediscover it.
- The flag is a claim about a CAPABILITY, never about data observed today — the
  distinction `matchEvents` already spells out, and the one trap 32 punishes.

## Alternatives considered

- **Probe the endpoint and hide the tab on an empty result** — trap 55: an
  unsupported league is a `200` with `[]`, indistinguishable from a quiet season.
- **Gate on the slug alone** — works today by accident (PL slugs are null), but
  would silently open a broken tab the moment Serie A published slugs without
  publishing identity.
- **Show the tab everywhere and let it empty out** — a tab that always fails is
  worse than no tab.
