# 0032 — The Clubs screen browses one league at a time, behind the same filter row as Matchdays

- **Date:** 2026-08-25
- **Status:** Accepted
- **Decided by:** Ed Medina

## Context
The Clubs screen browsed `DEFAULT_LEAGUE` and nothing else: the roster under
`BROWSE LALIGA` was hardcoded to LaLiga, and the only route to an Arsenal was to
type its name. The handoff (`SPEC.md` §3.4) shows a league row under the
subscribed card, and Matchdays already had the component for it — `LeagueSwitch`
(ADR 0031), a horizontal row of artwork tiles.

The two-query split stays exactly as it was: `TeamView` carries **no** league
field, so league membership is only knowable from which league's roster a slug
comes back in. The browse list must be fetched league-scoped; it cannot be
filtered out of the unscoped set.

## Decision
- **`LeagueSwitch` moves onto Clubs**, between the subscribed card and the
  browse header, and drives `useTeams(league.apiSlug)`. The header follows it:
  `EXPLORAR PREMIER LEAGUE`.
- **The selected league is screen state, not a preference.** It is a place in a
  list, and Matchdays forgets its league on the same reasoning. Nothing about a
  reader's follows depends on it.
- **The row is hidden while searching.** Search runs over every tracked club
  (the field says "Search 100 clubs", and looking up Arsenal from the LaLiga tab
  must find it). A league filter sitting above results that ignore it would
  claim a scope the list does not have.
- **Only the browse list waits on the roster.** The screen used to gate
  everything on `teams.isPending || browse.isPending`; switching league would
  then blank the screen — taking the filter row itself off-screen under the
  reader's finger — and, worse, `results` goes empty first, so the
  no-results sentence flashed before the skeleton. Now `teams.isPending` gates
  the screen and `browse.isPending` gates the list alone, skeleton first.

### `leagueOptions()` moved to the catalogue
Both screens need `LEAGUES` mapped to `{ slug, name, logoUrl }`, and that
mapping carries a trap worth stating once: `LeagueRef.logoUrls` is keyed
**semantically** (`primary`/`icon`/`wordmark`), the opposite of `TeamView`'s
size keys, so the fallback order is `icon → primary → logoUrl`. It now lives in
`lib/cronogol/leagues.ts` beside the catalogue it maps, and Matchdays reads it
from there. It returns a structural shape rather than importing `LeagueOption`,
so the data layer keeps knowing nothing about the component layer (ADR 0013).

## Consequences
- Every tracked league is now reachable by browsing, not only by search.
- Switching league costs one `catalogue`-cadence fetch per league, cached by
  `keys.teams(apiSlug)` for the session — a second visit to a league is instant.
- The subscribed card is unfiltered on purpose: it lists who you follow, which
  is not a statement about the league being browsed.
- Not addressed: a league with `live: false` (Ligue 1, when it arrives) will
  appear in the row and browse to an empty list. `LIVE_LEAGUES` exists for that
  and the row should take it once a non-live league is actually in the
  catalogue — today all four are live, so filtering would be untestable code.
