/**
 * The global news feed, for the NEWS widget (ADR 0061).
 *
 * ⚠ `STALE.feed` (15 min), not a bucket of its own: aggregated ingest is hourly
 * at :20 and the route is `max-age=60`, so fifteen minutes is honest and a
 * faster refetch is handed back the identical body. Not `catalogue` — a day is
 * a lie for a feed that moves hourly.
 *
 * ⚠ Twenty, not the route's default thirty: the widget writes eight and warms
 * four images. Twenty is the 48h window's worth on a busy day; thirty is just
 * more JSON.
 */
import { useQuery } from '@tanstack/react-query';

import { getNews } from '@/lib/cronogol/client';
import { keys } from './keys';
import { GC_TIME, STALE } from './stale';

const FEED_LIMIT = 20;

export function useNews() {
  return useQuery({
    queryKey: keys.news(),
    queryFn: () => getNews({ limit: FEED_LIMIT }),
    staleTime: STALE.feed,
    gcTime: GC_TIME,
  });
}
