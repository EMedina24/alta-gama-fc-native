/**
 * Matchweek ("jornada") derivations.
 *
 * ⚠ PORTED FROM `cronogol/lib/cronogol/jornada.ts` (ADR 0018). Two changes:
 *
 * - `LEAGUE_ZONE` folded into `League.zone` in `leagues.ts`, so there is one
 *   league table rather than two that must agree.
 * - **`dayGroups` no longer carries a rendered row.** The web version put a
 *   server-rendered `<li>` inside each slot because the grouping ran on the
 *   client and the markup did not. Here it is generic over anything with an
 *   `id`, a `kickoffUtc` and a `kickoffTbd`, and the list renderer maps over the
 *   groups itself. The *grouping rule* is what was worth porting, not the
 *   plumbing — see the function's own comment.
 */

import { zonedDayKey } from '@/lib/format';

import { findLeagueByApiSlug } from './leagues';
import type { JornadaSummaryView } from './types';

/**
 * Whether a round is a midweek round.
 *
 * ⚠ Read in the LEAGUE's zone, not the reader's — "a midweek round is midweek
 * *where the league is*". A 21:00 Tuesday kickoff in Madrid is already Wednesday
 * in Tokyo, and it is still a Spanish midweek round.
 *
 * ⚠ Gated on `kickoffsConfirmed`, so the badge cannot appear, move and vanish
 * as provisional dates settle.
 */
export function isMidweek(
  firstKickoffUtc: string | null,
  kickoffsConfirmed: boolean,
  leagueApiSlug: string,
): boolean {
  if (!kickoffsConfirmed || firstKickoffUtc === null) return false;
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: findLeagueByApiSlug(leagueApiSlug)?.zone ?? 'UTC',
    weekday: 'short',
  }).format(new Date(firstKickoffUtc));
  return weekday === 'Tue' || weekday === 'Wed';
}

/**
 * Whether a round is in the first half of the season (ida rather than vuelta).
 *
 * ⚠ A null `totalMatchweeks` defaults to `true` rather than guessing 38 — the
 * count is derived from the club count and is 34 in the Bundesliga and 42 in
 * segunda. Only meaningful where `League.hasHalves`.
 */
export function isIda(matchweek: number, totalMatchweeks: number | null): boolean {
  if (totalMatchweeks === null) return true;
  return matchweek <= totalMatchweeks / 2;
}

/**
 * The round a league is on, or the one it is about to play.
 *
 * There is no `currentMatchweek` on the API and no `isCurrent` flag — the index
 * is a list of rounds and nothing marks one. So it is derived: the first round
 * whose last kickoff has not passed.
 *
 * ⚠ **Sorted on `firstKickoffUtc`, which the API's own order is not.** The index
 * is ordered by matchweek *number*, and on live data matchweek 6 kicks off
 * before matchweek 5 — a deferred fixture is enough to do it. Scanning in the
 * given order returns the wrong round the moment that happens.
 *
 * ⚠ Falls back to the first round rather than null when everything is in the
 * past. This reads a clock, which `nextUpIndex` refuses to do, and for the
 * reason it refuses: the API tier has shipped a finished season before, and a
 * clock comparison would then render an empty screen forever. The fallback is
 * what makes reading the clock safe here.
 *
 * ⚠ The dates it returns are provisional wherever `kickoffsConfirmed` is false,
 * which is most of the season on most leagues. A caller printing a date range
 * has to gate on that flag; the round *number* is stable either way.
 */
export function currentMatchweek(
  matchweeks: readonly JornadaSummaryView[],
  now: Date,
): JornadaSummaryView | null {
  if (matchweeks.length === 0) return null;

  const byDate = [...matchweeks].sort(
    (a, b) => Date.parse(a.firstKickoffUtc ?? '') - Date.parse(b.firstKickoffUtc ?? ''),
  );

  const at = now.getTime();
  const ahead = byDate.find(
    (week) => week.lastKickoffUtc !== null && Date.parse(week.lastKickoffUtc) >= at,
  );

  return ahead ?? byDate[0];
}

/** The minimum a fixture must expose to be grouped into days. */
export interface DayGroupable {
  id: string;
  kickoffUtc: string;
  /**
   * ⚠ True means the timestamp is a DATE wearing a midnight-UTC time, not an
   * instant. Read its calendar day in UTC, never in the viewer's zone.
   */
  kickoffTbd: boolean;
}

export interface DayGroup<T extends DayGroupable> {
  /** Includes the zone, so a zone change replaces headers instead of relabelling. */
  key: string;
  /** Any instant in the group; the header label is formatted from it. */
  iso: string;
  /** The zone the label must be read in — `"UTC"` for a floating day. */
  zone: string;
  items: T[];
}

/**
 * Buckets a round's matches by calendar day for the day-header bars.
 *
 * A provisional kickoff is `00:00:00Z` — a date, not an instant. Converting it
 * through a timezone is a category error: midnight UTC reads as the *previous*
 * day everywhere west of Greenwich, so New York would date a round to 15 Sep
 * when the league published 16 Sep. Floating days are therefore read in UTC,
 * exactly as an iCalendar `DATE` value is never converted; confirmed kickoffs
 * group in the viewer's zone, so a Monday 21:00 CEST kickoff correctly appears
 * under Tuesday in Tokyo.
 *
 * ⚠ Insertion order, never sorted. The API orders confirmed kickoffs first, then
 * by time — a deliberate editorial order (what you can actually plan around,
 * first) — and sorting by day would float a provisional date above a confirmed one.
 *
 * A `Map` rather than a sequential scan, so a confirmed row and a floating row
 * that happen to share a label can never produce two identically-titled headers:
 * the zone prefix in the key keeps a floating group and a real group from ever
 * merging.
 */
export function dayGroups<T extends DayGroupable>(
  items: readonly T[],
  zone: string,
): DayGroup<T>[] {
  const groups = new Map<string, DayGroup<T>>();
  for (const item of items) {
    const dayZone = item.kickoffTbd ? 'UTC' : zone;
    const key = `${dayZone}:${zonedDayKey(item.kickoffUtc, dayZone)}`;
    const found = groups.get(key);
    if (found) found.items.push(item);
    else groups.set(key, { key, iso: item.kickoffUtc, zone: dayZone, items: [item] });
  }
  return [...groups.values()];
}
