/**
 * The Today board's reads.
 *
 * ⚠ **FINISHED TODAY comes from `/cronogol/fixtures`, not `/cronogol/scores`.**
 * The scoreboard is a world feed — Liga Argentina, friendlies, Portuguese
 * fixtures — whose `tournament.name` is free text, with no slug and an explicit
 * "do not join them" against our clubs. It can serve neither "grouped by tracked
 * league" nor our own crests. The fixture window carries `leagueSlug`,
 * `logoUrls` on our storage, `goalsHome`/`goalsAway` and `status`.
 *
 * The scoreboard is still read, for one job only: the in-progress tile and the
 * `lastUpdateAt` age line beside it.
 */
import { useQuery } from '@tanstack/react-query';

import { getFixtureWindow, getScores } from '@/lib/cronogol/client';
import { todayBounds, upcomingBounds } from '@/lib/cronogol/fixture-window';
import { keys } from './keys';
import { STALE } from './stale';

const UPCOMING_DAYS = 7;

/** Today's played matches, in the reader's own day. */
export function useFinishedToday(zone: string) {
  // ⚠ Bounds are computed per render but keyed to the DAY, not the instant, so a
  // re-render does not mint a new cache entry every second.
  const { from, to } = todayBounds(new Date(), zone);
  return useQuery({
    queryKey: keys.fixtureWindow(from.slice(0, 10), 'today'),
    queryFn: () => getFixtureWindow({ from, to }),
    staleTime: STALE.feed,
  });
}

/** The next week, for "upcoming from your clubs". */
export function useUpcoming(zone: string) {
  const { from, to } = upcomingBounds(new Date(), zone, UPCOMING_DAYS);
  return useQuery({
    queryKey: keys.fixtureWindow(from.slice(0, 10), 'upcoming'),
    queryFn: () => getFixtureWindow({ from, to }),
    staleTime: STALE.feed,
  });
}

/**
 * The scoreboard, today and yesterday.
 *
 * ⚠ `days: 2` is the only value the UI should send — only the newest two buckets
 * are kept fresh.
 */
export function useScoreboard() {
  return useQuery({
    queryKey: keys.scores(2),
    queryFn: () => getScores({ days: 2 }),
    staleTime: STALE.feed,
  });
}
