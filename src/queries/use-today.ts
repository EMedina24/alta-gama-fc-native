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
 *
 * ⚠⚠ **Every window here is BOUNDED BY `now`, and the bounds are computed in the
 * `queryFn` — at the moment the request is made — not during render** (ADR
 * 0052). The key stays the DAY, so this mints no new cache entry; what it fixes
 * is `refetch()`. Rendered bounds are frozen at whichever render last ran, which
 * on this screen can be a minute old, so a refetch fired at kick-off was asking
 * for a window that ENDED BEFORE the match started — and `to` is exclusive, so
 * the fixture came back missing from the very refetch that went looking for it.
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
  // ⚠ Keyed to the DAY, not the instant, so a re-render does not mint a new
  // cache entry every second. Only `from` is needed for that — the window the
  // request actually asks for is built inside `queryFn`.
  const { from } = todayBounds(new Date(), zone);
  return useQuery({
    queryKey: keys.fixtureWindow(from.slice(0, 10), 'today'),
    // ⚠ Bounds re-read at request time — see this file's docblock.
    queryFn: () => getFixtureWindow(todayBounds(new Date(), zone)),
    staleTime: STALE.feed,
  });
}

/** The next week, for "upcoming from your clubs". */
export function useUpcoming(zone: string) {
  const { from } = upcomingBounds(new Date(), zone, UPCOMING_DAYS);
  return useQuery({
    queryKey: keys.fixtureWindow(from.slice(0, 10), 'upcoming'),
    queryFn: () => getFixtureWindow(upcomingBounds(new Date(), zone, UPCOMING_DAYS)),
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
  const { from } = upcomingBounds(new Date(), zone, WIDGET_WINDOW_DAYS);
  return useQuery({
    queryKey: keys.fixtureWindow(from.slice(0, 10), 'widget'),
    queryFn: () => getFixtureWindow(upcomingBounds(new Date(), zone, WIDGET_WINDOW_DAYS)),
    staleTime: STALE.feed,
  });
}

/** The past fortnight, for the LAST RESULT card (and the live card's snapshot). */
export function useRecent(zone: string) {
  const { from } = recentBounds(new Date(), zone, RECENT_DAYS);
  return useQuery({
    queryKey: keys.fixtureWindow(from.slice(0, 10), 'recent'),
    queryFn: () => getFixtureWindow(recentBounds(new Date(), zone, RECENT_DAYS)),
    staleTime: STALE.feed,
  });
}
