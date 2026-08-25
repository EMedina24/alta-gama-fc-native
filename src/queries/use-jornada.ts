/**
 * One league's matchweek index, and one matchweek's fixtures.
 *
 * ⚠ `getJornada` is only enabled once a matchweek number is known and validated
 * against the index. The route 400s outside 1–60, and guessing 1 before the
 * index lands would fire a request the screen then throws away.
 */
import { useQuery } from '@tanstack/react-query';

import { getJornada } from '@/lib/cronogol/client';
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
