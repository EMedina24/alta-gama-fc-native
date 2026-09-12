/**
 * One league's matchweek index, and one matchweek's fixtures.
 *
 * ⚠ `getJornada` is only enabled once a matchweek number is known and validated
 * against the index. The route 400s outside 1–60, and guessing 1 before the
 * index lands would fire a request the screen then throws away.
 */
import { useQuery } from '@tanstack/react-query';

import { getJornada, getUclJornada, getUclSeasonRounds } from '@/lib/cronogol/client';
import { SEASON, type League } from '@/lib/cronogol/leagues';
import { keys } from './keys';
import { STALE } from './stale';

export { useSeasonJornadas } from './use-standings';

export function useJornada(league: League, matchweek: number | null) {
  return useQuery({
    queryKey: keys.jornada(league.apiSlug, SEASON, matchweek ?? 0),
    queryFn: () => getJornada(league.apiSlug, SEASON, matchweek as number),
    enabled: matchweek !== null,
    staleTime: STALE.feed,
  });
}

/**
 * The Champions League season index (§124, ADR 0156).
 *
 * ⚠ `STALE.feed`, like every other schedule query. The route's own header is
 * `max-age=60` — fresher than the standings route's 300 — and that is NOT a
 * licence to treat it as live: trap 8 stands, and a 60-second cache on the
 * server says nothing about how often the data behind it moves.
 *
 * ⚠ Unconditional, unlike `useUclStandings`. The index is what SIZES the pager
 * and names the opening round, so the tab cannot draw its chrome without it —
 * and it is one small request shared by every round the reader visits.
 */
export function useUclSeasonRounds(enabled: boolean) {
  return useQuery({
    queryKey: keys.uclSeasonRounds(SEASON),
    queryFn: () => getUclSeasonRounds(SEASON),
    staleTime: STALE.feed,
    enabled,
  });
}

/**
 * One league-phase round.
 *
 * ⚠ Enabled only once a matchday is known, the `useJornada` rule — but for a
 * different reason worth writing down: this route does **not** 400 outside the
 * range the way the domestic one does. `matchday` is validated 1-20 against the
 * column's own CHECK, so a 9 comes back as a cheerful empty round. The pager
 * bounds itself on the index's `matchdays.length` instead, and this gate stops
 * the speculative request before the index has landed.
 */
export function useUclJornada(matchday: number | null) {
  return useQuery({
    queryKey: keys.uclJornada(SEASON, matchday ?? 0),
    queryFn: () => getUclJornada(SEASON, matchday as number),
    enabled: matchday !== null,
    staleTime: STALE.feed,
  });
}
