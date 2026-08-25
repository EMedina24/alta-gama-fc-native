/**
 * The club catalogue.
 *
 * ⚠ `catalogue` cadence: a club roster moves on transfer windows, not on match
 * days. Omitting `league` returns every tracked club — ~100 and growing, so a
 * search field has something to search.
 */
import { useQuery } from '@tanstack/react-query';

import { getTeams } from '@/lib/cronogol/client';
import { sortClubs } from '@/lib/cronogol/derive';
import { keys } from './keys';
import { STALE } from './stale';

export function useTeams(leagueApiSlug?: string) {
  return useQuery({
    queryKey: keys.teams(leagueApiSlug),
    queryFn: () => getTeams(leagueApiSlug ? { league: leagueApiSlug } : {}),
    staleTime: STALE.catalogue,
    // Sorted here rather than at the call site so every consumer gets the same
    // order: the API sorts on its own display name, which files Barcelona under
    // "FC" and Osasuna under "CA".
    select: sortClubs,
  });
}
