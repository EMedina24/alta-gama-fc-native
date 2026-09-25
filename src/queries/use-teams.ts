/**
 * The club catalogue.
 *
 * ⚠ `catalogue` cadence: a club roster moves on transfer windows, not on match
 * days. Omitting `league` returns every tracked club — ~100 and growing, so a
 * search field has something to search.
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { getTeams } from '@/lib/cronogol/client';
import { hasCompleteSchedule, sortClubs } from '@/lib/cronogol/derive';
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

/**
 * Whether a club has a page worth opening (ADR 0154) — shared by every surface
 * that links to a club from a row it did not choose: the Table, and the match
 * lists' crests (ADR 0191).
 *
 * ⚠ **Half the Champions League field has none.** 18 of the 36 are absent
 * from `GET /cronogol/teams`; their club route answers `200` with
 * `lastSyncedAt: null`, which is trap 1 — a hero, a squad and a standing
 * strip with nothing in them. `undefined` data (loading, or a failed
 * catalogue fetch) resolves to FALSE: never draw a link you cannot honour.
 *
 * ⚠ `hasCompleteSchedule` rather than mere membership, and rather than a
 * hardcoded list: it is the field that already means this, and it self-corrects
 * the day the backend widens coverage. It also rejects the `''` team-window
 * sentinel, which is in no catalogue.
 */
export function useCanOpenClub(): (slug: string) => boolean {
  const teams = useTeams();
  return useMemo(() => {
    const bySlug = new Map((teams.data ?? []).map((team) => [team.slug, team]));
    return (slug: string) => {
      const team = bySlug.get(slug);
      return team ? hasCompleteSchedule(team) : false;
    };
  }, [teams.data]);
}
