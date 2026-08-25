/**
 * Date, time and name formatting.
 *
 * ⚠ PORTED FROM `cronogol/lib/format.ts` (ADR 0018), trimmed to what this app
 * renders. Two rules survive intact and both are load-bearing:
 *
 * 1. **`en-US` inside these functions is arithmetic, not display.** Its weekday
 *    abbreviations are ASCII and unchanged across every ICU build ever shipped,
 *    so they are safe as keys into the pinned phrase tables, and the month comes
 *    back as a number that indexes an array. Nothing these formatters ask of
 *    `Intl` reaches the screen in any language.
 * 2. **The 12-hour clock is assembled by hand**, never `hour12: true`. See
 *    `formatKickoffTime`.
 *
 * ⚠ This whole module rests on `Intl.DateTimeFormat.prototype.formatToParts`
 * accepting a named IANA `timeZone`. On iOS, Hermes delegates `Intl` to Apple's
 * Foundation, so this works — but it is the single assumption that would take
 * the date layer down, so `_debug` exercises it across a DST boundary.
 */

import type { Phrases } from './i18n/phrases';

/**
 * The zone shift, read back as stable tokens.
 * See the header: `en-US` here is arithmetic, not display.
 */
function zonedParts(iso: string, zone: string, phrases: Phrases) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
  }).formatToParts(new Date(iso));

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return {
    weekday: phrases.weekdays[get('weekday')] ?? '',
    day: get('day'),
    month: phrases.months[Number(get('month')) - 1] ?? '',
  };
}

/**
 * `2026-08-15` — the calendar day an instant falls on in a zone, as a sortable
 * grouping key. Never rendered, hence no `Phrases`.
 *
 * ⚠ Assembled from `formatToParts` rather than leaning on `en-CA`'s ISO-shaped
 * pattern, because a CLDR release is allowed to restyle a locale's pattern and
 * is not allowed to change what the `year`/`month`/`day` parts contain.
 */
export function zonedDayKey(iso: string, zone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    year: 'numeric',
    day: 'numeric',
    month: 'numeric',
  }).formatToParts(new Date(iso));

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${get('year')}-${get('month').padStart(2, '0')}-${get('day').padStart(2, '0')}`;
}

/** "SÁB 15 AGO" / "SAT 15 AUG" — the fixture row's date block. */
export function formatFixtureDate(iso: string, zone: string, phrases: Phrases): string {
  return Object.values(zonedParts(iso, zone, phrases)).join(' ').toUpperCase();
}

/** `{ weekday, day, month }` for the season spine's stacked three-line rail. */
export function fixtureDateParts(iso: string, zone: string, phrases: Phrases) {
  const { weekday, day, month } = zonedParts(iso, zone, phrases);
  return { weekday: weekday.toUpperCase(), day, month: month.toUpperCase() };
}

/**
 * "21:00" — or "9:00 pm" when the reader has chosen the 12-hour clock — and the
 * same shape in every language the app speaks.
 *
 * ⚠ The 12-hour form is assembled by hand from the 24-hour parts rather than
 * asked of `Intl` with `hour12: true`: CLDR styles the meridiem per locale
 * ("9:00 p. m." in es-ES) and per release, and the design pins one shape —
 * lowercase bare `am`/`pm`, no periods — across every language.
 */
export function formatKickoffTime(
  iso: string,
  zone: string,
  clock: '24' | '12' = '24',
): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  // ⚠ "24" can come back from `Intl` for midnight on some ICU builds.
  const hour = Number(get('hour')) % 24;
  const minute = get('minute');

  if (clock === '12') {
    return `${hour % 12 || 12}:${minute} ${hour < 12 ? 'am' : 'pm'}`;
  }
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

/** "Saturday" / "Sábado" — the Today board's eyebrow. */
export function formatWeekdayLong(iso: string, zone: string, phrases: Phrases): string {
  return new Intl.DateTimeFormat(phrases.intl, { timeZone: zone, weekday: 'long' })
    .format(new Date(iso));
}

/**
 * Accent- and case-insensitive fold, for search.
 * NFD then strip the combining marks: `Atlético` → `atletico`.
 */
export function foldAccents(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** "Ed Medina" → "EM". The account avatar. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
