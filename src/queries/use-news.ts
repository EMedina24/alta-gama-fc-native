/**
 * The global news feed — for the NEWS widget (ADR 0061), the Today card and
 * the News screen (ADR 0064). One query, three consumers.
 *
 * ⚠ `STALE.feed` (15 min), not a bucket of its own: aggregated ingest is hourly
 * at :20 and the route is `max-age=60`, so fifteen minutes is honest and a
 * faster refetch is handed back the identical body. Not `catalogue` — a day is
 * a lie for a feed that moves hourly.
 *
 * ⚠ Thirty — the route's default and the web's page. It was twenty when the
 * widget was the only reader (it writes eight); the screen shows a day or two
 * of headlines and twenty ran out mid-YESTERDAY on a busy news day.
 */
import { useQuery } from '@tanstack/react-query';

import { getNews, getNewsLeagues } from '@/lib/cronogol/client';
import { keys } from './keys';
import { GC_TIME, STALE } from './stale';

const FEED_LIMIT = 30;

export function useNews() {
  return useQuery({
    queryKey: keys.news(),
    queryFn: () => getNews({ limit: FEED_LIMIT }),
    staleTime: STALE.feed,
    gcTime: GC_TIME,
  });
}

/**
 * The feed sliced to one news-league id. Mounted only while that chip is
 * active — `enabled` keeps `all` from spending a request on every league.
 */
export function useNewsByLeague(leagueId: string | null) {
  return useQuery({
    queryKey: keys.newsLeague(leagueId ?? ''),
    queryFn: () => getNews({ league: leagueId ?? undefined, limit: FEED_LIMIT }),
    staleTime: STALE.feed,
    gcTime: GC_TIME,
    enabled: leagueId !== null,
  });
}

/** The chip set. Changes on a migration, not a sweep — a catalogue. */
export function useNewsLeagues() {
  return useQuery({
    queryKey: keys.newsLeagues(),
    queryFn: getNewsLeagues,
    staleTime: STALE.catalogue,
    gcTime: GC_TIME,
  });
}
