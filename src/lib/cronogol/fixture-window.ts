/**
 * Date-window arithmetic for `GET /cronogol/fixtures`.
 *
 * ⚠ PORTED FROM `cronogol/lib/cronogol/fixture-window.ts` (ADR 0018), reduced to
 * the bounds half. The web app's seven-column week grid (`weekDays`, `DAY_CAP`,
 * `overflowHref`) has no counterpart in this design and is not ported; the
 * zone-offset fixpoint underneath it is, because every window this app asks for
 * depends on it.
 */

import { zonedDayKey } from '@/lib/format';

/**
 * The zone offset at an instant, in milliseconds.
 *
 * `Intl` is the only thing in the platform that knows a zone's history, so the
 * offset is recovered by formatting the instant in the zone, reading those wall
 * parts back as if they were UTC, and diffing.
 */
function zoneOffsetMs(at: Date, zone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    // ⚠ `Intl` can answer "24" for midnight on some ICU builds, the same trap
    // `formatKickoffTime` guards against.
    get('hour') % 24,
    get('minute'),
    get('second'),
  );

  return asUtc - at.getTime();
}

/** `"2026-08-09"` + n days, as calendar arithmetic — no instant, so no DST. */
export function addDays(dayKey: string, days: number): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/**
 * The instant at which a calendar day begins in a zone.
 *
 * ⚠ Corrected TWICE. The offset that applies is the one at the *answer*, not at
 * the guess, and the two differ across a DST boundary. The second pass lands on
 * it — the standard fixpoint for this, and cheap enough to just do.
 */
export function zonedMidnight(dayKey: string, zone: string): Date {
  const guess = new Date(`${dayKey}T00:00:00Z`);
  const once = new Date(guess.getTime() - zoneOffsetMs(guess, zone));
  return new Date(guess.getTime() - zoneOffsetMs(once, zone));
}

/**
 * `[today's local midnight, now]` — what the Today board's FINISHED TODAY
 * section asks for.
 *
 * ⚠ **Send these rather than letting the server default.** Its default `from` is
 * **UTC** midnight and it picks no timezone, ever. A UTC window drawn as Madrid
 * days loses every kickoff between midnight and 02:00, and a reader in Auckland
 * gets a window starting half a day in their past.
 *
 * ⚠ `to` on this route is **EXCLUSIVE** — `[from, to)` — unlike `to` on
 * `/cronogol/teams/{slug}/fixtures`, which is inclusive. The two differ on purpose.
 */
export function todayBounds(now: Date, zone: string): { from: string; to: string } {
  const today = zonedDayKey(now.toISOString(), zone);
  return { from: zonedMidnight(today, zone).toISOString(), to: now.toISOString() };
}

/**
 * `[now, local midnight n days out)` — the upcoming band.
 *
 * Ends on a midnight rather than "now + n×24h" so the last day is a whole
 * calendar day in the reader's zone, which is what a day-grouped list wants.
 */
export function upcomingBounds(
  now: Date,
  zone: string,
  days: number,
): { from: string; to: string } {
  const today = zonedDayKey(now.toISOString(), zone);
  return {
    from: now.toISOString(),
    to: zonedMidnight(addDays(today, days), zone).toISOString(),
  };
}
