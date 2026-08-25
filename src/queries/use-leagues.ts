/**
 * League artwork and tints, keyed by `apiSlug`.
 *
 * ⚠ `catalogue` cadence: this set changes when an operator registers a
 * competition, not on a sweep.
 */
import { useQuery } from '@tanstack/react-query';

import { getLeagues } from '@/lib/cronogol/client';
import type { LeagueRef } from '@/lib/cronogol/types';
import { STALE } from './stale';

export function useLeagueArtwork() {
  return useQuery({
    queryKey: ['leagues'],
    queryFn: getLeagues,
    staleTime: STALE.catalogue,
    select: (leagues): Record<string, LeagueRef> =>
      Object.fromEntries(leagues.map((league) => [league.slug, league])),
  });
}
