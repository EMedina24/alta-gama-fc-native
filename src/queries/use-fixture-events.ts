/**
 * One finished match's timeline, fetched when its row is opened.
 *
 * ⚠ **On expand, never with the list.** Pre-fetching a matchday would be ten
 * requests for nine panels nobody opened, on a route whose own header is
 * `max-age=60`. Each surface keeps one row open at a time, so this is at most
 * one request in flight per screen (ADR 0045).
 *
 * ⚠ `STALE.feed`, not `catalogue`. A finished match's events are effectively
 * immutable — but a VAR retraction rewrites the set, and the three-hourly sweep
 * can land after the first read, so a `count: 0` must not be cached for a day.
 *
 * ⚠ `null` from the query means no such fixture. `{ events: [] }` means we hold
 * none YET. **Neither means the match was goalless** — the panel's copy is the
 * one place that distinction is visible, so it lives there, not here.
 */
import { useQuery } from '@tanstack/react-query';

import { getFixtureEvents } from '@/lib/cronogol/client';
import { keys } from './keys';
import { STALE } from './stale';

export function useFixtureEvents(fixtureId: string | null) {
  return useQuery({
    queryKey: keys.fixtureEvents(fixtureId ?? ''),
    queryFn: () => getFixtureEvents(fixtureId as string),
    enabled: fixtureId !== null,
    staleTime: STALE.feed,
  });
}
