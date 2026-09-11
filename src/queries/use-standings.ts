/**
 * The league table, plus the matchweek index its caption needs.
 *
 * ⚠ **The caption costs a second request per league.** `completedMatchweek` needs
 * `matchweeks[]`, which the standings payload does not carry, so the Table screen
 * is `1 + n` requests rather than 1. React Query dedupes it against the Matchdays
 * screen, which wants the same index.
 */
import { useQueries, useQuery } from '@tanstack/react-query';

import { getSeasonJornadas, getStandings, getUclStandings } from '@/lib/cronogol/client';
import { ROUND_LEAGUES, SEASON, type League } from '@/lib/cronogol/leagues';
import { keys } from './keys';
import { STALE } from './stale';

export function useStandings() {
  return useQuery({
    queryKey: keys.standings(),
    // Omitting `league` returns EVERY published league in one request.
    queryFn: () => getStandings(),
    staleTime: STALE.feed,
  });
}

/**
 * The Champions League league-phase table.
 *
 * ⚠ **`STALE.feed`, and the justification `stale.ts` asks for:** the route's own
 * header is `Cache-Control: public, max-age=300`, which the API doc states is
 * deliberately matched to `GET /cronogol/standings` — already a `feed` query.
 * `feed` is "everything that moves when a match is played", which is exactly
 * this. `catalogue` would sit stale across a whole matchday; `live` would poll a
 * five-minute-cached body twenty times a cycle, which that bucket forbids.
 *
 * ⚠ **`enabled` is the active-tab gate.** The Table screen has six tabs and only
 * one of them is this; a reader who never opens it costs no request.
 *
 * ⚠ `SEASON` is sent explicitly rather than left to the server's default (the
 * `useSeasonJornadas` pattern), so the cache key cannot straddle a server-side
 * rollover.
 *
 * ⚠ **No matchweek-index companion.** The caption reads `matchday` verbatim off
 * this payload, so this tab is ONE request — not the `1 + n` the domestic tabs
 * pay for `completedMatchweek`.
 */
export function useUclStandings(enabled: boolean) {
  return useQuery({
    queryKey: keys.uclStandings(SEASON),
    queryFn: () => getUclStandings({ season: SEASON }),
    staleTime: STALE.feed,
    enabled,
  });
}

export function useSeasonJornadas(league: League) {
  return useQuery({
    queryKey: keys.seasonJornadas(league.apiSlug, SEASON),
    queryFn: () => getSeasonJornadas(league.apiSlug, SEASON),
    staleTime: STALE.feed,
  });
}

/**
 * Every ROUNDS league's matchweek index at once, for the table captions.
 *
 * ⚠ `ROUND_LEAGUES`, not `LEAGUES`: a league with no matchweek index answers
 * `200` with an empty `matchweeks[]`, so asking would cost a request per Table
 * visit to learn nothing. The caption's own `null` branch already covers the
 * absence — it degrades to the club count, which is trap 2's honest state.
 */
export function useAllSeasonJornadas() {
  return useQueries({
    queries: ROUND_LEAGUES.map((league) => ({
      queryKey: keys.seasonJornadas(league.apiSlug, SEASON),
      queryFn: () => getSeasonJornadas(league.apiSlug, SEASON),
      staleTime: STALE.feed,
    })),
    combine: (results) => ({
      // Keyed by apiSlug so a caller never has to trust array order.
      byLeague: Object.fromEntries(
        ROUND_LEAGUES.map((league, i) => [league.apiSlug, results[i]?.data ?? null]),
      ),
      isPending: results.some((r) => r.isPending),
    }),
  });
}
