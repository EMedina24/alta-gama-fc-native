/**
 * The reel's feed — the SAME route as `useNews`, paged by keyset (ADR 0129).
 *
 * ⚠ A separate infinite query, not a rewrite of `useNews`: that query's key
 * and shape are held by three consumers (widget writer ADR 0061, Today card,
 * link sheet) and an infinite envelope would break all of them. Page one is
 * SEEDED from their cache instead, so opening the reel from the Today card
 * stays a cache read — only swiping past page one spends a request.
 *
 * ⚠ Only whitelisted params travel (`limit` / `before` / `league`): the route's
 * DTO is `forbidNonWhitelisted` and a stray param 400s the whole call.
 *
 * ⚠ Past `STALE.feed`, tanstack refetches EVERY loaded page in sequence on the
 * next mount. Acceptable at 15 min for a screen usually shorter-lived than
 * that; `maxPages` is the lever if it ever bites.
 */
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

import { getNews } from '@/lib/cronogol/client';
import type { NewsFeedView } from '@/lib/cronogol/types';
import { keys } from './keys';
import { GC_TIME, STALE } from './stale';
import { FEED_LIMIT } from './use-news';

export function useNewsReel(leagueId: string | null) {
  const qc = useQueryClient();
  const seedKey = leagueId === null ? keys.news() : keys.newsLeague(leagueId);

  return useInfiniteQuery({
    queryKey: keys.newsReel(leagueId ?? 'all'),
    queryFn: ({ pageParam }) =>
      getNews({ limit: FEED_LIMIT, league: leagueId ?? undefined, before: pageParam }),
    initialPageParam: undefined as string | undefined,
    /** `nextBefore: null` is the last page — the reel's "caught up" card. */
    getNextPageParam: (last) => last.nextBefore ?? undefined,
    /** Page one straight from the shared single-page cache (see docblock). */
    initialData: () => {
      const one = qc.getQueryData<NewsFeedView>(seedKey);
      return one ? { pages: [one], pageParams: [undefined] } : undefined;
    },
    /** Stamped with the SEED's age, or a stale page one would count as fresh. */
    initialDataUpdatedAt: () => qc.getQueryState(seedKey)?.dataUpdatedAt,
    staleTime: STALE.feed,
    gcTime: GC_TIME,
  });
}
