/**
 * The live-scores poll — `GET /cronogol/live`.
 *
 * ⚠⚠ **The only polling query in the app, and the gate is the feature.** A bare
 * `refetchInterval` is a request every fifteen seconds for the life of the
 * process, on cellular, for data that is an empty array most of the day. Two
 * things stop that and both are load-bearing:
 *
 * - `enabled` — the caller passes screen focus AND whether there is anything to
 *   upgrade. A backgrounded tab does not poll, and neither does a reader who
 *   follows no clubs.
 * - `refetchIntervalInBackground: false` — React Query keeps an interval running
 *   when the app backgrounds unless told otherwise. This is the same argument
 *   `watchAppStateForRefresh` makes about token refresh: waking to spend
 *   requests nobody is waiting on.
 *
 * ⚠ `refetchOnWindowFocus` is globally `false` (`queries/client.ts`), so this
 * query cannot lean on a focus refetch — the interval is the whole refresh.
 *
 * ⚠⚠ **An empty `matches` array is the NORMAL answer** and never an error
 * state. So is a failed poll: the Today board falls through to the fixture
 * sweep's own card, which states its age, rather than surfacing anything.
 */
import { useQuery } from '@tanstack/react-query';

import { getLive } from '@/lib/cronogol/client';
import { keys } from './keys';
import { GC_TIME, STALE } from './stale';

/**
 * ⚠ **Never below 10 seconds.** The route is `Cache-Control: max-age=10` and
 * the data behind it moves every ~30s, so a 5s poll doubles the request count
 * and is handed back the identical body.
 */
const POLL_MS = 15_000;

/**
 * @param enabled Screen focus AND something to join to. Both, not either — see
 * the docblock above.
 */
export function useLive(enabled: boolean) {
  return useQuery({
    queryKey: keys.live(),
    queryFn: () => getLive(),
    staleTime: STALE.live,
    gcTime: GC_TIME,
    enabled,
    // ⚠ `false`, not `0`: React Query treats 0 as "poll as fast as you can".
    refetchInterval: enabled ? POLL_MS : false,
    refetchIntervalInBackground: false,
  });
}
