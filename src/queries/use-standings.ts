/**
 * The league table, plus the matchweek index its caption needs.
 *
 * ⚠ **The caption costs a second request per league.** `completedMatchweek` needs
 * `matchweeks[]`, which the standings payload does not carry, so the Table screen
 * is `1 + n` requests rather than 1. React Query dedupes it against the Matchdays
 * screen, which wants the same index.
 */
import { useQueries, useQuery } from '@tanstack/react-query';

import { getSeasonJornadas, getStandings } from '@/lib/cronogol/client';
import { LEAGUES, SEASON, type League } from '@/lib/cronogol/leagues';
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

export function useSeasonJornadas(league: League) {
  return useQuery({
    queryKey: keys.seasonJornadas(league.apiSlug, SEASON),
    queryFn: () => getSeasonJornadas(league.apiSlug, SEASON),
    staleTime: STALE.feed,
  });
}

/** Every league's matchweek index at once, for the table captions. */
export function useAllSeasonJornadas() {
  return useQueries({
    queries: LEAGUES.map((league) => ({
      queryKey: keys.seasonJornadas(league.apiSlug, SEASON),
      queryFn: () => getSeasonJornadas(league.apiSlug, SEASON),
      staleTime: STALE.feed,
    })),
    combine: (results) => ({
      // Keyed by apiSlug so a caller never has to trust array order.
      byLeague: Object.fromEntries(
        LEAGUES.map((league, i) => [league.apiSlug, results[i]?.data ?? null]),
      ),
      isPending: results.some((r) => r.isPending),
    }),
  });
}
