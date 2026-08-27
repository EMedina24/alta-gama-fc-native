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
 * ⚠ The scoreboard is NOT read here at all — not even for the in-progress card.
 * It cannot say which match is *yours* (no crosswalk to our clubs, and name
 * matching is forbidden), so the live and last-result cards read the same
 * fixture route. See ADR 0027.
 */
import { useQuery } from '@tanstack/react-query';

import { WIDGET_WINDOW_DAYS } from '@/features/widgets/snapshot';
import { getFixtureWindow } from '@/lib/cronogol/client';
import { recentBounds, todayBounds, upcomingBounds } from '@/lib/cronogol/fixture-window';
import { keys } from './keys';
import { STALE } from './stale';

const UPCOMING_DAYS = 7;
/** Two weeks back covers an international break; nothing older is a "last result". */
const RECENT_DAYS = 14;

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
 * The window the WIDGET snapshot is built from (ADR 0047).
 *
 * ⚠ **Three weeks, not the seven days `useUpcoming` asks for.** A followed club
 * can easily have nothing inside a week — an international break, or a cup round
 * this route does not carry — and the widget would then say "no matches
 * scheduled" while the club page shows a match on day nine. The small widget
 * has one job and going blank at it is the failure that matters.
 *
 * ⚠ **21 days is chosen against a HARD 31-day cap on the route**, which answers
 * 400 rather than clamping (`fixtureWindowMaxDays` in the backend's
 * `configuration.ts`). Do not raise this without checking that number.
 *
 * ⚠ A separate query, not a widened `useUpcoming` — that one feeds the Today
 * board's seven-day band, and widening it would change what every reader
 * downloads on launch to serve a surface most of them cannot see.
 */
export function useWidgetWindow(zone: string) {
  const { from, to } = upcomingBounds(new Date(), zone, WIDGET_WINDOW_DAYS);
  return useQuery({
    queryKey: keys.fixtureWindow(from.slice(0, 10), 'widget'),
    queryFn: () => getFixtureWindow({ from, to }),
    staleTime: STALE.feed,
  });
}

/** The past fortnight, for the LAST RESULT card (and the live card's snapshot). */
export function useRecent(zone: string) {
  const { from, to } = recentBounds(new Date(), zone, RECENT_DAYS);
  return useQuery({
    queryKey: keys.fixtureWindow(from.slice(0, 10), 'recent'),
    queryFn: () => getFixtureWindow({ from, to }),
    staleTime: STALE.feed,
  });
}
