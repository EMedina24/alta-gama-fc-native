/**
 * Crest URL sets for whole competitions — the STANDINGS widget's artwork
 * source (ADR 0185).
 *
 * ⚠ **`STALE.catalogue`, and the justification `stale.ts` asks for:** a crest
 * set changes when a club rebrands or a roster syncs, not when a match is
 * played. The route's own `max-age=300` is a ceiling for browsers, not a claim
 * that the set moves every five minutes; `feed` would re-ask seven routes on
 * every foreground for an answer that is the same all season.
 *
 * ⚠ `enabled` is the widget gate — a device that cannot show a widget never
 * pays for these.
 */
import { useQueries } from '@tanstack/react-query';

import { getCrests } from '@/lib/cronogol/client';
import { UCL_LEAGUE_PHASE } from '@/lib/cronogol/competitions';
import { LEAGUES, SEASON } from '@/lib/cronogol/leagues';
import type { ClubCrestView } from '@/lib/cronogol/types';

import { keys } from './keys';
import { STALE } from './stale';

/** Every domestic league we hold config for, plus the league phase. */
const SETS: readonly { apiSlug: string; season: number | null }[] = [
  ...LEAGUES.map((league) => ({ apiSlug: league.apiSlug, season: null })),
  // ⚠ Our route slug and the wire's agree for the cup — `champions-league` is
  // the one value `?league=` accepts that is not in `GET /cronogol/leagues`.
  { apiSlug: UCL_LEAGUE_PHASE.slug, season: SEASON },
];

export function useCrestSets(enabled: boolean) {
  return useQueries({
    queries: SETS.map((set) => ({
      queryKey: keys.crests(set.apiSlug, set.season),
      queryFn: () =>
        getCrests(
          set.season === null
            ? { league: set.apiSlug }
            : { league: set.apiSlug, season: set.season },
        ),
      staleTime: STALE.catalogue,
      enabled,
    })),
    combine: (results) => ({
      /** Every crest from every set that has resolved, in set order. */
      crests: results.flatMap((result) => result.data?.crests ?? []) as ClubCrestView[],
      /**
       * ⚠ True only when EVERY set answered. The crest sweep waits for this: a
       * set that failed would otherwise look like seven clubs that no longer
       * exist, and their files would be deleted and re-downloaded next launch.
       */
      complete: results.every((result) => result.isSuccess),
      /** Changes only when data does — the sync effect keys on it. */
      updatedAt: results.reduce((latest, result) => Math.max(latest, result.dataUpdatedAt), 0),
    }),
  });
}
