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

/**
 * "SAT 5 — MON 7 SEP 2026" — a matchday's span, in the reader's zone.
 *
 * Shared parts collapse to the right: a same-month span prints the month and
 * year once, a cross-month span repeats the month, a cross-year span repeats
 * everything. A single day is just that day. Jornada 1 of 2026/27 ran 15–27 Aug
 * on a deferred opener, so spans are not assumed to be weekends.
 *
 * ⚠ Only meaningful when the round's `kickoffsConfirmed` is true — provisional
 * dates print a range that moves. The caller owns that gate.
 */
export function formatDateRange(
  fromIso: string,
  toIso: string,
  zone: string,
  phrases: Phrases,
): string {
  const a = { ...zonedParts(fromIso, zone, phrases), year: zonedDayKey(fromIso, zone).slice(0, 4) };
  const b = { ...zonedParts(toIso, zone, phrases), year: zonedDayKey(toIso, zone).slice(0, 4) };

  let text: string;
  if (zonedDayKey(fromIso, zone) === zonedDayKey(toIso, zone)) {
    text = `${a.weekday} ${a.day} ${a.month} ${a.year}`;
  } else if (a.year === b.year && a.month === b.month) {
    text = `${a.weekday} ${a.day} — ${b.weekday} ${b.day} ${b.month} ${b.year}`;
  } else if (a.year === b.year) {
    text = `${a.weekday} ${a.day} ${a.month} — ${b.weekday} ${b.day} ${b.month} ${b.year}`;
  } else {
    text = `${a.weekday} ${a.day} ${a.month} ${a.year} — ${b.weekday} ${b.day} ${b.month} ${b.year}`;
  }
  return text.toUpperCase();
}

/** `{ weekday, day, month }` for the season spine's stacked three-line rail. */
export function fixtureDateParts(iso: string, zone: string, phrases: Phrases) {
  const { weekday, day, month } = zonedParts(iso, zone, phrases);
  return { weekday: weekday.toUpperCase(), day, month: month.toUpperCase() };
}

export interface RelativeDay {
  label: string;
  /** Only today is lit — one accent thing per section. */
  tone: 'accent' | 'faint';
}

/**
 * "TONIGHT" / "TOMORROW" / "SAT 30 AUG" — the day an upcoming kickoff falls on,
 * decided on the viewer's calendar (`zonedDayKey`) so a late-night kickoff
 * that is "tonight" in Madrid is still tomorrow's row for a reader in Mexico.
 *
 * ⚠ Never call this for a `kickoffTbd` row: its `00:00:00Z` placeholder is a
 * date wearing a midnight time, and it would claim "tonight" for a match with
 * no kickoff at all. Those rows show the calendar date, faint.
 */
export function formatRelativeDay(
  iso: string,
  zone: string,
  now: Date,
  words: { tonight: string; tomorrow: string },
  phrases: Phrases,
): RelativeDay {
  const day = zonedDayKey(iso, zone);
  const today = zonedDayKey(now.toISOString(), zone);
  if (day === today) return { label: words.tonight, tone: 'accent' };
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (day === zonedDayKey(tomorrow.toISOString(), zone)) {
    return { label: words.tomorrow, tone: 'faint' };
  }
  return { label: formatFixtureDate(iso, zone, phrases), tone: 'faint' };
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

/**
 * `Sat 21:00` / `Sáb 21:00` — the WIDGET's one date string (SPEC §4).
 *
 * ⚠ **Sentence case, where every other date block in this app is UPPERCASE.**
 * That is not drift: `formatFixtureDate` renders a weekday in a stacked date
 * block, where caps are the design. The widget renders it inline beside an
 * opponent's name and a venue, at 12pt, in a 148pt tile — shouting it there
 * fights the club name for the row. The mock draws it this way in both sizes.
 *
 * ⚠ The weekday still comes from the PINNED tables in `phrases.ts`, not from
 * `Intl` display output — the same rule the whole module rests on. Only the
 * casing is this function's own.
 *
 * ⚠ Never call this for a `kickoffTbd` fixture: its `00:00:00Z` placeholder is a
 * date wearing a midnight time. The widget snapshot filters those out before it
 * ever gets here.
 */
export function formatWidgetKickoff(
  iso: string,
  zone: string,
  clock: '24' | '12',
  phrases: Phrases,
): string {
  const { weekday } = zonedParts(iso, zone, phrases);
  const sentence = weekday ? weekday.charAt(0).toUpperCase() + weekday.slice(1).toLowerCase() : '';
  const time = formatKickoffTime(iso, zone, clock);
  return sentence ? `${sentence} ${time}` : time;
}

/**
 * `{ day: 'SAT', time: '21:00' }` — the medium widget's stacked kickoff column
 * (ADR 0059).
 *
 * ⚠ UPPERCASE where `formatWidgetKickoff` is sentence case, and that is the
 * same rule applied to a different placement: this is a stacked date block,
 * which is where caps are the design (`formatFixtureDate`, the season spine).
 * The inline `Sat 21:00` still serves the small widget and the accessories.
 *
 * ⚠ Same `kickoffTbd` precondition as `formatWidgetKickoff`.
 */
export function formatWidgetKickoffParts(
  iso: string,
  zone: string,
  clock: '24' | '12',
  phrases: Phrases,
): { day: string; time: string } {
  const { weekday } = zonedParts(iso, zone, phrases);
  return { day: weekday.toUpperCase(), time: formatKickoffTime(iso, zone, clock) };
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
