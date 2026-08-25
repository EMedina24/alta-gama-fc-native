/**
 * A club's season and squad.
 *
 * ⚠ Both answer `null` on a 404 rather than throwing — an unknown slug is the
 * screen's empty state, not an error boundary. And a tracked club with no
 * registered squad answers `200 { players: [] }`, which is a DIFFERENT state
 * from `null` and needs its own copy.
 */
import { useQuery } from '@tanstack/react-query';

import { findTeamFixtures, getTeamSquad } from '@/lib/cronogol/client';
import { keys } from './keys';
import { STALE } from './stale';

export function useClubFixtures(slug: string) {
  return useQuery({
    queryKey: keys.teamFixtures(slug),
    queryFn: () => findTeamFixtures(slug),
    staleTime: STALE.feed,
    enabled: Boolean(slug),
  });
}

export function useClubSquad(slug: string) {
  return useQuery({
    queryKey: keys.teamSquad(slug),
    queryFn: () => getTeamSquad(slug),
    // A squad moves on transfer windows, not on match days.
    staleTime: STALE.catalogue,
    enabled: Boolean(slug),
  });
}
